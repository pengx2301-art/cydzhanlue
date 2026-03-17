from openai import OpenAI

client = OpenAI(
    api_key="sk-checkin-FV0NFvYJDxiW8oK1vfhzY9Se5d08aq34",
    base_url="https://gpt.qt.cool/v1"
)

r = client.chat.completions.create(
    model="gpt-5.1-codex-mini",
    messages=[{"role": "user", "content": "请回复：API连接成功"}],
    max_tokens=20
)
print("✅", r.choices[0].message.content)
