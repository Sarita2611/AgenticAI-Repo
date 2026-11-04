import os
from typing import TypedDict

from openai import OpenAI


class ChatMessageInput(TypedDict):
    role: str
    content: str


class ChatServiceNotConfigured(RuntimeError):
    pass


class ChatServiceError(RuntimeError):
    pass


def generate_reply(messages: list[ChatMessageInput]) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ChatServiceNotConfigured("OPENAI_API_KEY is not configured.")

    try:
        completion = OpenAI(api_key=api_key).chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
        )
    except Exception as error:
        raise ChatServiceError(f"OpenAI service error: {error}") from error

    reply = completion.choices[0].message.content
    if not reply:
        raise ChatServiceError("OpenAI returned an empty reply.")
    return reply
