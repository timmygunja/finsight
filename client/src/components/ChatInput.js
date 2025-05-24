"use client";

import { useState, useRef } from "react";
import "./ChatInput.css";

function ChatInput({ onSendMessage, disabled }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;

    onSendMessage(text, files);
    setText("");
    setFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      {files.length > 0 && (
        <div className="file-chips">
          {files.map((file, index) => (
            <div key={index} className="file-chip">
              <span className="file-name">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="remove-file-btn"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="input-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or upload files for analysis..."
          className="text-input"
          disabled={disabled}
        />

        <div className="action-buttons">
          <button
            type="button"
            className="upload-btn"
            onClick={triggerFileInput}
            disabled={disabled}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
            </svg>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden-file-input"
              accept=".txt,.json,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.gif"
              disabled={disabled}
            />
          </button>

          <button
            type="submit"
            className="send-btn"
            disabled={disabled || (!text.trim() && files.length === 0)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <p className="file-count">
          {files.length} file{files.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </form>
  );
}

export default ChatInput;
