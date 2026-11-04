import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { API_URL, apiRequest } from "./api.js";
import "./style.css";

const ADMIN_STORAGE_KEY = "hr-chatbot-demo-admin";

function getInitialAdminName() {
  const url = new URL(window.location.href);
  const adminName = url.searchParams.get("admin")?.trim();
  if (adminName) {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, adminName);
    url.searchParams.delete("admin");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    return adminName;
  }
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) || "";
}

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const name = username.trim();
    if (!name) {
      setError("Enter an admin username to continue.");
      return;
    }
    onLogin(name);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <a className="brand" href="/" aria-label="HR Assistant admin home">
          <span className="brand-mark">H</span>
          <span>People &amp; Culture <small>ADMIN CONSOLE</small></span>
        </a>
        <p className="eyebrow">BACK OFFICE</p>
        <h1>Sign in to the admin console</h1>
        <p className="intro">
          Enter an admin display name to open the local service console.
        </p>
        <aside className="notice" role="note">
          Demo only: this username screen does not authenticate or authorize
          access. The backend currently has no admin accounts or roles.
        </aside>
        <form className="form-grid" onSubmit={submit}>
          <label htmlFor="admin-username">Admin username</label>
          <input
            id="admin-username"
            autoComplete="username"
            maxLength={100}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
            placeholder="e.g. admin"
            required
            value={username}
          />
          {error && <p className="feedback error" role="alert">{error}</p>}
          <button className="button primary" type="submit">
            Continue to dashboard
          </button>
        </form>
        <a className="text-link" href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
          Open backend Swagger docs <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}

function AdminDashboard({ adminName, onLogout }) {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userForm, setUserForm] = useState({ username: "", nickname: "" });
  const [heroForm, setHeroForm] = useState({
    name: "",
    secret_name: "",
    age: "",
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingHeroId, setEditingHeroId] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading("users");
    setError("");
    try {
      const data = await apiRequest("/users/");
      setUsers(data);
      setSelectedUserId((current) =>
        current || (data.length ? String(data[0].id) : ""),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }, []);

  const loadHeroes = useCallback(async () => {
    setLoading("heroes");
    setError("");
    try {
      setHeroes(await apiRequest("/heroes/"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadHeroes();
  }, [loadUsers, loadHeroes]);

  function clearFeedback() {
    setError("");
    setNotice("");
  }

  function beginEditUser(user) {
    clearFeedback();
    setEditingUserId(user.id);
    setUserForm({
      username: user.username,
      nickname: user.nickname || "",
    });
    document.getElementById("user-form")?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelUserEdit() {
    setEditingUserId(null);
    setUserForm({ username: "", nickname: "" });
  }

  async function saveUser(event) {
    event.preventDefault();
    clearFeedback();
    setLoading("user-save");
    try {
      await apiRequest(
        editingUserId ? `/users/${editingUserId}` : "/users/",
        {
          method: editingUserId ? "PATCH" : "POST",
          body: {
            username: userForm.username.trim(),
            nickname: userForm.nickname.trim() || null,
          },
        },
      );
      setNotice(editingUserId ? "User updated." : "User created.");
      cancelUserEdit();
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    clearFeedback();
    setLoading(`delete-user-${user.id}`);
    try {
      await apiRequest(`/users/${user.id}`, { method: "DELETE" });
      setNotice("User deleted.");
      if (String(user.id) === selectedUserId) {
        setSelectedUserId("");
        setHistory([]);
        setHistoryLoaded(false);
      }
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }

  function beginEditHero(hero) {
    clearFeedback();
    setEditingHeroId(hero.id);
    setHeroForm({
      name: hero.name,
      secret_name: hero.secret_name,
      age: hero.age ?? "",
    });
    document.getElementById("hero-form")?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelHeroEdit() {
    setEditingHeroId(null);
    setHeroForm({ name: "", secret_name: "", age: "" });
  }

  async function saveHero(event) {
    event.preventDefault();
    clearFeedback();
    setLoading("hero-save");
    const body = {
      name: heroForm.name.trim(),
      secret_name: heroForm.secret_name.trim(),
      age: heroForm.age === "" ? null : Number(heroForm.age),
    };
    try {
      await apiRequest(
        editingHeroId ? `/heroes/${editingHeroId}` : "/heroes/",
        {
          method: editingHeroId ? "PUT" : "POST",
          body,
        },
      );
      setNotice(editingHeroId ? "Hero updated." : "Hero created.");
      cancelHeroEdit();
      await loadHeroes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }

  async function deleteHero(hero) {
    if (!window.confirm(`Delete hero "${hero.name}"?`)) return;
    clearFeedback();
    setLoading(`delete-hero-${hero.id}`);
    try {
      await apiRequest(`/heroes/${hero.id}`, { method: "DELETE" });
      setNotice("Hero deleted.");
      await loadHeroes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }

  async function loadHistory(event) {
    event.preventDefault();
    if (!selectedUserId) {
      setError("Select a user before loading chat history.");
      return;
    }
    clearFeedback();
    setLoading("history");
    try {
      setHistory(await apiRequest(`/chat/history/${selectedUserId}`));
      setHistoryLoaded(true);
    } catch (requestError) {
      setError(requestError.message);
      setHistory([]);
      setHistoryLoaded(false);
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="admin-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="HR Assistant admin home">
          <span className="brand-mark">H</span>
          <span>People &amp; Culture <small>ADMIN CONSOLE</small></span>
        </a>
        <div className="topbar-actions">
          <a className="button secondary swagger-link" href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
            Backend Swagger <span aria-hidden="true">↗</span>
          </a>
          <span className="admin-name">Admin: <strong>{adminName}</strong></span>
          <button
            className="button ghost"
            onClick={onLogout}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="content">
        <p className="eyebrow">SERVICE CONSOLE</p>
        <h1>HR assistant administration</h1>
        <p className="intro">
          Manage demo users and heroes, inspect conversations, or verify
          endpoints directly in FastAPI Swagger.
        </p>

        <aside className="notice" role="note">
          Demo only: the username sign-in is a local screen, not backend
          authentication. These endpoints currently have no admin authorization.
          Do not expose this console or API publicly.
        </aside>

        <nav className="tabs" aria-label="Admin services">
          <button
            aria-current={activeTab === "users" ? "page" : undefined}
            className={activeTab === "users" ? "tab active" : "tab"}
            onClick={() => { clearFeedback(); setActiveTab("users"); }}
            type="button"
          >
            Users <span>{users.length}</span>
          </button>
          <button
            aria-current={activeTab === "heroes" ? "page" : undefined}
            className={activeTab === "heroes" ? "tab active" : "tab"}
            onClick={() => { clearFeedback(); setActiveTab("heroes"); }}
            type="button"
          >
            Heroes <span>{heroes.length}</span>
          </button>
          <button
            aria-current={activeTab === "history" ? "page" : undefined}
            className={activeTab === "history" ? "tab active" : "tab"}
            onClick={() => { clearFeedback(); setActiveTab("history"); }}
            type="button"
          >
            Chat history
          </button>
        </nav>

        {error && <p className="feedback error" role="alert">{error}</p>}
        {notice && <p className="feedback success" role="status">{notice}</p>}

        {activeTab === "users" && (
          <section className="workspace-grid">
            <section className="card" aria-labelledby="user-list-heading">
              <div className="card-heading">
                <div>
                  <h2 id="user-list-heading">Users</h2>
                  <p>Accounts registered for the customer portal.</p>
                </div>
                <button className="button secondary" onClick={loadUsers} disabled={loading === "users"} type="button">
                  {loading === "users" ? "Loading…" : "Refresh"}
                </button>
              </div>
              {loading === "users" ? (
                <p className="state" role="status">Loading users…</p>
              ) : users.length === 0 ? (
                <p className="state">No users found. Create one using the form.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ID</th><th>Username</th><th>Display name</th><th>Actions</th></tr></thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.username}</td>
                          <td>{user.nickname || "—"}</td>
                          <td className="row-actions">
                            <button className="button small secondary" onClick={() => beginEditUser(user)} type="button">Edit</button>
                            <button
                              className="button small danger"
                              disabled={loading === `delete-user-${user.id}`}
                              onClick={() => deleteUser(user)}
                              type="button"
                            >
                              {loading === `delete-user-${user.id}` ? "Deleting…" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card form-card" aria-labelledby="user-form-heading">
              <div className="card-heading">
                <div>
                  <h2 id="user-form-heading">{editingUserId ? "Edit user" : "Add user"}</h2>
                  <p>{editingUserId ? `Update user #${editingUserId}.` : "Create a customer portal account."}</p>
                </div>
              </div>
              <form className="form-grid" id="user-form" onSubmit={saveUser}>
                <label htmlFor="user-username">Username</label>
                <input
                  id="user-username"
                  maxLength={100}
                  onChange={(event) => setUserForm({ ...userForm, username: event.target.value })}
                  required
                  value={userForm.username}
                />
                <label htmlFor="user-nickname">Display name <span>(optional)</span></label>
                <input
                  id="user-nickname"
                  maxLength={100}
                  onChange={(event) => setUserForm({ ...userForm, nickname: event.target.value })}
                  value={userForm.nickname}
                />
                <div className="form-actions">
                  <button className="button primary" disabled={loading === "user-save"} type="submit">
                    {loading === "user-save" ? "Saving…" : editingUserId ? "Save changes" : "Create user"}
                  </button>
                  {editingUserId && <button className="button secondary" onClick={cancelUserEdit} type="button">Cancel</button>}
                </div>
              </form>
            </section>
          </section>
        )}

        {activeTab === "heroes" && (
          <section className="workspace-grid">
            <section className="card" aria-labelledby="hero-list-heading">
              <div className="card-heading">
                <div>
                  <h2 id="hero-list-heading">Heroes</h2>
                  <p>Hero records managed by the CRUD API.</p>
                </div>
                <button className="button secondary" onClick={loadHeroes} disabled={loading === "heroes"} type="button">
                  {loading === "heroes" ? "Loading…" : "Refresh"}
                </button>
              </div>
              {loading === "heroes" ? (
                <p className="state" role="status">Loading heroes…</p>
              ) : heroes.length === 0 ? (
                <p className="state">No heroes found. Create one using the form.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ID</th><th>Name</th><th>Secret name</th><th>Age</th><th>Actions</th></tr></thead>
                    <tbody>
                      {heroes.map((hero) => (
                        <tr key={hero.id}>
                          <td>{hero.id}</td>
                          <td>{hero.name}</td>
                          <td>{hero.secret_name}</td>
                          <td>{hero.age ?? "—"}</td>
                          <td className="row-actions">
                            <button className="button small secondary" onClick={() => beginEditHero(hero)} type="button">Edit</button>
                            <button
                              className="button small danger"
                              disabled={loading === `delete-hero-${hero.id}`}
                              onClick={() => deleteHero(hero)}
                              type="button"
                            >
                              {loading === `delete-hero-${hero.id}` ? "Deleting…" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card form-card" aria-labelledby="hero-form-heading">
              <div className="card-heading">
                <div>
                  <h2 id="hero-form-heading">{editingHeroId ? "Edit hero" : "Add hero"}</h2>
                  <p>{editingHeroId ? `Update hero #${editingHeroId}.` : "Create a hero record."}</p>
                </div>
              </div>
              <form className="form-grid" id="hero-form" onSubmit={saveHero}>
                <label htmlFor="hero-name">Name</label>
                <input
                  id="hero-name"
                  maxLength={100}
                  onChange={(event) => setHeroForm({ ...heroForm, name: event.target.value })}
                  required
                  value={heroForm.name}
                />
                <label htmlFor="hero-secret-name">Secret name</label>
                <input
                  id="hero-secret-name"
                  maxLength={100}
                  onChange={(event) => setHeroForm({ ...heroForm, secret_name: event.target.value })}
                  required
                  value={heroForm.secret_name}
                />
                <label htmlFor="hero-age">Age <span>(optional)</span></label>
                <input
                  id="hero-age"
                  max={150}
                  min={0}
                  onChange={(event) => setHeroForm({ ...heroForm, age: event.target.value })}
                  type="number"
                  value={heroForm.age}
                />
                <div className="form-actions">
                  <button className="button primary" disabled={loading === "hero-save"} type="submit">
                    {loading === "hero-save" ? "Saving…" : editingHeroId ? "Save changes" : "Create hero"}
                  </button>
                  {editingHeroId && <button className="button secondary" onClick={cancelHeroEdit} type="button">Cancel</button>}
                </div>
              </form>
            </section>
          </section>
        )}

        {activeTab === "history" && (
          <section className="card" aria-labelledby="history-heading">
            <div className="card-heading">
              <div>
                <h2 id="history-heading">Chat history</h2>
                <p>Load the saved conversation for a customer user.</p>
              </div>
            </div>
            <form className="history-filter" onSubmit={loadHistory}>
              <label htmlFor="history-user">Customer user</label>
              <select
                id="history-user"
                onChange={(event) => {
                  setSelectedUserId(event.target.value);
                  setHistory([]);
                  setHistoryLoaded(false);
                }}
                value={selectedUserId}
              >
                <option value="">Select a user…</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} (ID {user.id})
                  </option>
                ))}
              </select>
              <button className="button primary" disabled={loading === "history" || !selectedUserId} type="submit">
                {loading === "history" ? "Loading…" : "Load history"}
              </button>
            </form>
            {loading === "history" ? (
              <p className="state" role="status">Loading conversation…</p>
            ) : history.length === 0 ? (
              <p className="state">
                {historyLoaded
                  ? "No conversation history for this user."
                  : "Select a user and load their conversation history."}
              </p>
            ) : (
              <ol className="message-history">
                {history.map((message) => (
                  <li className={`history-message ${message.role}`} key={message.id}>
                    <div className="message-meta">
                      <strong>{message.role}</strong>
                      <time dateTime={message.created_at}>
                        {new Date(message.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p>{message.content}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        <footer className="api-footer">
          API base: <code>{API_URL}</code>
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">Open Swagger docs ↗</a>
        </footer>
      </section>
    </main>
  );
}

function App() {
  const [adminName, setAdminName] = useState(getInitialAdminName);

  function login(username) {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, username);
    setAdminName(username);
  }

  function logout() {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminName("");
  }

  return adminName ? (
    <AdminDashboard adminName={adminName} onLogout={logout} />
  ) : (
    <AdminLogin onLogin={login} />
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
