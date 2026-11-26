import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api.js";

const METRICS = [
  { key: "precision", label: "Precision", color: "#e8792f" },
  { key: "recall", label: "Recall", color: "#4b8f79" },
  { key: "mrr", label: "MRR", color: "#6d67b2" },
  { key: "faithfulness", label: "Faithfulness", color: "#397aa6" },
  { key: "answer_relevancy", label: "Answer relevancy", color: "#c45770" },
];

const EMPTY_FORM = {
  question: "",
  expected_answer: "",
  relevant_chunk_ids: [],
  category: "General",
  dataset_version: "v1",
};

function formatScore(value) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function MetricTrendChart({ runs }) {
  const chartWidth = 820;
  const chartHeight = 270;
  const left = 48;
  const right = 18;
  const top = 14;
  const bottom = 40;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;
  const xForIndex = (index) =>
    left + (runs.length > 1 ? (index / (runs.length - 1)) * plotWidth : plotWidth / 2);
  const yForScore = (score) => top + (1 - score) * plotHeight;

  if (!runs.length) {
    return (
      <p className="state">
        Run an evaluation to see precision, recall, MRR, faithfulness, and
        answer-relevancy trends.
      </p>
    );
  }

  return (
    <div className="evaluation-chart-wrap">
      <svg
        aria-label="Average evaluation metrics by run"
        className="evaluation-chart"
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = top + (1 - percent / 100) * plotHeight;
          return (
            <g key={percent}>
              <line
                className="chart-grid-line"
                x1={left}
                x2={chartWidth - right}
                y1={y}
                y2={y}
              />
              <text className="chart-axis-label" textAnchor="end" x={left - 8} y={y + 4}>
                {percent}%
              </text>
            </g>
          );
        })}
        <line
          className="chart-axis-line"
          x1={left}
          x2={chartWidth - right}
          y1={chartHeight - bottom}
          y2={chartHeight - bottom}
        />
        {METRICS.map((metric) => {
          const points = runs
            .map((run, index) => {
              const score = run[metric.key];
              return score == null
                ? null
                : `${xForIndex(index)},${yForScore(score)}`;
            })
            .filter(Boolean)
            .join(" ");
          return (
            <g key={metric.key}>
              {runs.length > 1 && (
                <polyline
                  fill="none"
                  points={points}
                  stroke={metric.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {runs.map((run, index) =>
                run[metric.key] == null ? null : (
                  <circle
                    cx={xForIndex(index)}
                    cy={yForScore(run[metric.key])}
                    fill={metric.color}
                    key={`${metric.key}-${run.run_id}`}
                    r="4"
                  >
                    <title>
                      Run {run.run_id}, {metric.label}: {formatScore(run[metric.key])}
                    </title>
                  </circle>
                ),
              )}
            </g>
          );
        })}
        {runs.map((run, index) => (
          <text
            className="chart-axis-label"
            key={run.run_id}
            textAnchor="middle"
            x={xForIndex(index)}
            y={chartHeight - 14}
          >
            Run {run.run_id}
          </text>
        ))}
      </svg>
      <div className="evaluation-legend">
        {METRICS.map((metric) => (
          <span key={metric.key}>
            <i style={{ backgroundColor: metric.color }} />
            {metric.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EvaluationDashboard() {
  const [dashboard, setDashboard] = useState({
    dataset_count: 0,
    dataset_versions: [],
    runs: [],
  });
  const [dataset, setDataset] = useState([]);
  const [chunks, setChunks] = useState([]);
  const [chatQuestions, setChatQuestions] = useState([]);
  const [latestResults, setLatestResults] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [chatQuestionId, setChatQuestionId] = useState("");
  const [chunkSearch, setChunkSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, datasetData, chunkData, questionData] =
        await Promise.all([
          apiRequest("/evaluation/dashboard"),
          apiRequest("/evaluation/dataset"),
          apiRequest("/evaluation/chunks"),
          apiRequest("/evaluation/chat-questions"),
        ]);
      setDashboard(dashboardData);
      setDataset(datasetData);
      setChunks(chunkData);
      setChatQuestions(questionData);
      if (
        dashboardData.dataset_versions.length > 0 &&
        !dashboardData.dataset_versions.includes(form.dataset_version)
      ) {
        setForm((current) => ({
          ...current,
          dataset_version: dashboardData.dataset_versions[0],
        }));
      }

      if (dashboardData.runs.length > 0) {
        const latestRun = await apiRequest(
          `/evaluation/runs/${dashboardData.runs[0].run_id}`,
        );
        setLatestResults(latestRun.results);
      } else {
        setLatestResults([]);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [form.dataset_version]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartRuns = useMemo(
    () => [...dashboard.runs].reverse(),
    [dashboard.runs],
  );
  const latestRun = dashboard.runs[0];
  const filteredChunks = useMemo(() => {
    const search = chunkSearch.trim().toLowerCase();
    if (!search) return chunks;
    return chunks.filter(
      (chunk) =>
        chunk.chunk_id.toLowerCase().includes(search) ||
        String(chunk.page_number).includes(search) ||
        chunk.preview.toLowerCase().includes(search),
    );
  }, [chunkSearch, chunks]);
  const versionQuestionCount = dataset.filter(
    (item) => item.dataset_version === form.dataset_version,
  ).length;

  async function addDatasetQuestion(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const created = await apiRequest("/evaluation/dataset", {
        method: "POST",
        body: form,
      });
      setDataset((current) => [created, ...current]);
      setNotice("Evaluation question added.");
      setForm((current) => ({
        ...EMPTY_FORM,
        dataset_version: current.dataset_version,
      }));
      setChatQuestionId("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function runEvaluation() {
    setRunning(true);
    setError("");
    setNotice("");
    try {
      const run = await apiRequest("/evaluation/runs", {
        method: "POST",
        body: { dataset_version: form.dataset_version },
      });
      setLatestResults(run.results);
      const dashboardData = await apiRequest("/evaluation/dashboard");
      setDashboard(dashboardData);
      setNotice(
        `Run ${run.run.run_id} evaluated ${run.results.length} question(s).`,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRunning(false);
    }
  }

  function chooseChatQuestion(event) {
    const messageId = event.target.value;
    setChatQuestionId(messageId);
    const selected = chatQuestions.find(
      (question) => String(question.message_id) === messageId,
    );
    if (selected) {
      setForm((current) => ({ ...current, question: selected.question }));
    }
  }

  function updateRelevantChunks(event) {
    const selectedIds = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    );
    setForm((current) => ({ ...current, relevant_chunk_ids: selectedIds }));
  }

  return (
    <section className="evaluation-dashboard" aria-labelledby="evaluation-heading">
      <div className="card evaluation-overview">
        <div className="card-heading evaluation-heading">
          <div>
            <h2 id="evaluation-heading">RAG evaluation dashboard</h2>
            <p>
              Compare retrieval and answer quality by evaluation run. Precision,
              recall, and MRR use relevant chunk labels; faithfulness and answer
              relevancy are AI-judged.
            </p>
          </div>
          <button
            className="button secondary"
            disabled={loading || running}
            onClick={loadData}
            type="button"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error && <p className="feedback error" role="alert">{error}</p>}
        {notice && <p className="feedback success" role="status">{notice}</p>}

        {loading ? (
          <p className="state" role="status">Loading evaluation data…</p>
        ) : (
          <>
            <div className="evaluation-score-grid">
              {METRICS.map((metric) => (
                <article className="evaluation-score-card" key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{formatScore(latestRun?.[metric.key])}</strong>
                  <small>{latestRun ? `Latest run #${latestRun.run_id}` : "No runs yet"}</small>
                </article>
              ))}
            </div>

            <div className="evaluation-chart-card">
              <div className="evaluation-chart-title">
                <div>
                  <h3>Metric trends</h3>
                  <p>Mean scores per run · 0–100%</p>
                </div>
                <span>{dashboard.runs.length} run(s)</span>
              </div>
              <MetricTrendChart runs={chartRuns} />
            </div>
          </>
        )}
      </div>

      <div className="evaluation-workspace">
        <section className="card" aria-labelledby="evaluation-form-heading">
          <div className="card-heading">
            <div>
              <h2 id="evaluation-form-heading">Evaluation dataset</h2>
              <p>Add a reference answer and select the relevant manual chunks.</p>
            </div>
            <span className="dataset-count">{dataset.length} question(s)</span>
          </div>
          <form className="form-grid evaluation-form" onSubmit={addDatasetQuestion}>
            <label htmlFor="chat-question-source">Start from chat history (optional)</label>
            <select
              id="chat-question-source"
              onChange={chooseChatQuestion}
              value={chatQuestionId}
            >
              <option value="">Choose a past user question…</option>
              {chatQuestions.map((question) => (
                <option key={question.message_id} value={question.message_id}>
                  {question.question.slice(0, 120)}
                </option>
              ))}
            </select>

            <label htmlFor="evaluation-question">Test question</label>
            <textarea
              id="evaluation-question"
              onChange={(event) =>
                setForm((current) => ({ ...current, question: event.target.value }))
              }
              required
              rows={3}
              value={form.question}
            />

            <label htmlFor="evaluation-answer">Expected answer</label>
            <textarea
              id="evaluation-answer"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  expected_answer: event.target.value,
                }))
              }
              required
              rows={3}
              value={form.expected_answer}
            />

            <div className="evaluation-form-row">
              <div>
                <label htmlFor="evaluation-category">Category</label>
                <input
                  id="evaluation-category"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  required
                  value={form.category}
                />
              </div>
              <div>
                <label htmlFor="evaluation-version">Dataset version</label>
                <input
                  id="evaluation-version"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dataset_version: event.target.value,
                    }))
                  }
                  required
                  value={form.dataset_version}
                />
              </div>
            </div>

            <label htmlFor="evaluation-chunks">
              Relevant chunks ({form.relevant_chunk_ids.length} selected)
            </label>
            <input
              aria-label="Filter policy chunks"
              onChange={(event) => setChunkSearch(event.target.value)}
              placeholder="Filter by chunk ID, page, or text"
              value={chunkSearch}
            />
            <select
              id="evaluation-chunks"
              multiple
              onChange={updateRelevantChunks}
              required
              size={8}
              value={form.relevant_chunk_ids}
            >
              {filteredChunks.map((chunk) => (
                <option key={chunk.chunk_id} value={chunk.chunk_id}>
                  Page {chunk.page_number} · {chunk.chunk_id} · {chunk.preview}
                </option>
              ))}
            </select>
            <small className="form-help">
              Hold Ctrl (Windows) or Command (Mac) to select multiple chunks.
            </small>

            <button className="button primary" disabled={saving} type="submit">
              {saving ? "Saving…" : "Add to evaluation dataset"}
            </button>
          </form>
        </section>

        <section className="card" aria-labelledby="dataset-entries-heading">
          <div className="card-heading">
            <div>
              <h2 id="dataset-entries-heading">Test questions</h2>
              <p>Past chat questions can seed examples; add a verified answer and labels.</p>
            </div>
          </div>
          {dataset.length === 0 ? (
            <p className="state">Add at least one labeled question to run an evaluation.</p>
          ) : (
            <div className="table-wrap">
              <table className="evaluation-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Version</th>
                    <th>Category</th>
                    <th>Relevant chunks</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.map((item) => (
                    <tr key={item.id}>
                      <td>{item.question}</td>
                      <td>{item.dataset_version}</td>
                      <td>{item.category}</td>
                      <td>{item.relevant_chunk_ids.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card evaluation-runs-card">
        <div className="card-heading">
          <div>
            <h2>Evaluation runs</h2>
            <p>Run version <strong>{form.dataset_version}</strong> · {versionQuestionCount} question(s)</p>
          </div>
          <button
            className="button primary"
            disabled={running || versionQuestionCount === 0}
            onClick={runEvaluation}
            type="button"
          >
            {running ? "Evaluating…" : "Run evaluation"}
          </button>
        </div>
        {running && (
          <p className="state" role="status">
            Generating answers and judging each example. This can take a while.
          </p>
        )}
        {dashboard.runs.length > 0 && (
          <div className="table-wrap">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Date</th>
                  <th>Model</th>
                  <th>Embedding</th>
                  <th>Prompt</th>
                  <th>Chunks</th>
                  <th>Top K</th>
                  <th>Dataset</th>
                  <th>Questions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.runs.map((run) => (
                  <tr key={run.run_id}>
                    <td>#{run.run_id}</td>
                    <td>{new Date(run.run_date).toLocaleString()}</td>
                    <td>{run.model_name}</td>
                    <td>{run.embedding_model}</td>
                    <td>{run.prompt_version}</td>
                    <td>{run.chunk_size}</td>
                    <td>{run.top_k}</td>
                    <td>{run.dataset_version}</td>
                    <td>{run.result_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {latestResults.length > 0 && (
        <section className="card evaluation-results-card">
          <div className="card-heading">
            <div>
              <h2>Latest run results</h2>
              <p>Actual answers, retrieval scores, and retrieved context.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Actual answer</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>MRR</th>
                  <th>Faithfulness</th>
                  <th>Answer relevancy</th>
                  <th>Time</th>
                  <th>Context</th>
                </tr>
              </thead>
              <tbody>
                {latestResults.map((result) => {
                  const item = dataset.find(
                    (entry) => entry.id === result.question_id,
                  );
                  return (
                    <tr key={result.id}>
                      <td>{item?.question || `Question #${result.question_id}`}</td>
                      <td>{result.actual_answer}</td>
                      <td>{formatScore(result.precision)}</td>
                      <td>{formatScore(result.recall)}</td>
                      <td>{formatScore(result.mrr)}</td>
                      <td>{formatScore(result.faithfulness)}</td>
                      <td>{formatScore(result.answer_relevancy)}</td>
                      <td>{result.execution_time.toFixed(2)}s</td>
                      <td>
                        <details>
                          <summary>{result.retrieved_context.length} chunk(s)</summary>
                          {result.retrieved_context.map((chunk) => (
                            <p className="retrieved-chunk" key={chunk.chunk_id}>
                              <strong>Page {chunk.page_number} · {chunk.chunk_id}</strong>
                              <br />
                              {chunk.content}
                            </p>
                          ))}
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
