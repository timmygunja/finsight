"use client";

import { useState } from "react";
import "./ChatMessage.css";
import VisualizationRenderer from "./VisualizationRenderer";

function ChatMessage({ message }) {
  const [showFullContent, setShowFullContent] = useState(false);

  const isUser = message.role === "user";
  const hasLongContent = message.content && message.content.length > 500;
  const displayContent =
    showFullContent || !hasLongContent
      ? message.content
      : `${message.content.substring(0, 500)}...`;

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    }
    if (
      fileType.includes("spreadsheet") ||
      fileType.includes("excel") ||
      fileType.includes("csv")
    ) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="8" y1="13" x2="16" y2="13"></line>
          <line x1="8" y1="17" x2="16" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    }
    if (fileType.includes("json")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    }
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    );
  };

  return (
    <div
      className={`message-container ${
        isUser ? "user-message" : "system-message"
      }`}
    >
      <div
        className={`message-avatar ${isUser ? "user-avatar" : "system-avatar"}`}
      >
        {isUser ? "U" : "A"}
      </div>

      <div
        className={`message-content ${message.error ? "error-message" : ""}`}
      >
        {message.files && message.files.length > 0 && (
          <div className="message-files">
            {message.files.map((file, index) => (
              <div key={index} className="file-badge">
                {getFileIcon(file.type)}
                <span className="file-name">{file.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="message-text">{displayContent}</div>

        {hasLongContent && (
          <button
            className="show-more-btn"
            onClick={() => setShowFullContent(!showFullContent)}
          >
            {showFullContent ? "Show less" : "Show more"}
          </button>
        )}

        {message.visualizations && message.visualizations.length > 0 && (
          <div className="visualizations">
            <h4 className="">Визуализации:</h4>
            {message.visualizations.map((viz, index) => (
              <VisualizationRenderer key={index} visualization={viz} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
