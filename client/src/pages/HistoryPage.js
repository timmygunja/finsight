"use client";

import { useState, useEffect } from "react";
import "./HistoryPage.css";

function HistoryPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.SERVER_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Get user ID from local storage
        const userId = localStorage.getItem("userId");

        if (!userId) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Fetch conversations from API
        const response = await fetch(
          `${API_URL}/api/conversations?userId=${userId}`
        );

        if (!response.ok) {
          // Проверяем, что ответ содержит JSON
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw new Error(
              `Server error: ${errorData.error || response.status}`
            );
          } else {
            // Если ответ не JSON, получаем текст ошибки
            const errorText = await response.text();
            console.error("Non-JSON response:", errorText);
            throw new Error(
              `Server returned non-JSON response: ${response.status}`
            );
          }
        }

        const data = await response.json();
        setConversations(data);
        setLoading(false);
      } catch (err) {
        console.error("Ошибка при загрузке истории разговоров:", err);
        setError(`Не удалось загрузить историю разговоров: ${err.message}`);
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleViewConversation = (conversationId) => {
    // In a real app, this would navigate to the conversation
    // For now, we'll just log it
    console.log("View conversation:", conversationId);
    // router.push(`/conversation/${conversationId}`)
  };

  const handleExportConversation = async (conversationId) => {
    try {
      // Fetch the full conversation
      const response = await fetch(
        `${API_URL}/api/conversations/${conversationId}`
      );

      if (!response.ok) {
        // Проверяем, что ответ содержит JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(
            `Server error: ${errorData.error || response.status}`
          );
        } else {
          // Если ответ не JSON, получаем текст ошибки
          const errorText = await response.text();
          console.error("Non-JSON response:", errorText);
          throw new Error(
            `Server returned non-JSON response: ${response.status}`
          );
        }
      }

      const data = await response.json();

      // Create a JSON file for download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      // Create a download link and click it
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${conversationId}.json`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting conversation:", error);
      alert(`Failed to export conversation: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="history-loading">Загрузка истории разговоров...</div>
    );
  }

  if (error) {
    return <div className="history-error">{error}</div>;
  }

  return (
    <div className="history-page">
      <h1>История разговоров</h1>

      {conversations.length === 0 ? (
        <div className="history-empty">Разговоры не найдены</div>
      ) : (
        <div className="history-list">
          {conversations.map((conversation) => (
            <div key={conversation.conversationId} className="history-item">
              <div className="history-item-header">
                <h3>Разговор {conversation.conversationId.substring(5, 13)}</h3>
                <span className="history-date">
                  {formatDate(conversation.updatedAt)}
                </span>
              </div>

              <div className="history-preview">
                {conversation.messages.slice(0, 2).map((message, index) => (
                  <div
                    key={index}
                    className={`history-message ${message.role}`}
                  >
                    <strong>
                      {message.role === "user" ? "Вы" : "Ассистент"}:
                    </strong>{" "}
                    {message.content.substring(0, 100)}
                    {message.content.length > 100 ? "..." : ""}
                  </div>
                ))}
              </div>

              <div className="history-actions">
                <button
                  className="history-view-btn"
                  onClick={() =>
                    handleViewConversation(conversation.conversationId)
                  }
                >
                  Просмотреть
                </button>
                <button
                  className="history-export-btn"
                  onClick={() =>
                    handleExportConversation(conversation.conversationId)
                  }
                >
                  Экспорт
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
