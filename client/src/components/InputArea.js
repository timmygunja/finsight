"use client";

import { useState, useRef } from "react";
// Import styles directly
import "./InputArea.css";

function InputArea({ onSendMessage, loading }) {
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;

    onSendMessage(message, selectedFiles);
    setMessage("");
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);

    // Ограничиваем количество файлов до 5
    if (selectedFiles.length + files.length > 5) {
      alert("Вы можете прикрепить максимум 5 файлов");
      return;
    }

    // Добавляем новые файлы к уже выбранным
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);

    // Сбрасываем input, чтобы можно было выбрать те же файлы повторно
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes("image")) {
      return (
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
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    } else if (fileType.includes("pdf")) {
      return (
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    } else if (
      fileType.includes("excel") ||
      fileType.includes("sheet") ||
      fileType.includes("csv")
    ) {
      return (
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    } else {
      return (
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
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-area">
      <div className="input-area-container">
        <button
          type="button"
          className="attach-button"
          onClick={() => fileInputRef.current.click()}
          disabled={selectedFiles.length >= 5}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="file-input"
          style={{ display: "none" }}
          accept=".txt,.json,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.gif,.pdf"
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите сообщение или загрузите файл..."
          className="message-input"
          disabled={loading}
        />
        <button type="submit" className="send-button" disabled={loading}>
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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
          )}
        </button>
      </div>
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <div className="files-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-preview">
                {getFileIcon(file.type)}
                <span>
                  {file.name.length > 15
                    ? file.name.substring(0, 12) + "..."
                    : file.name}
                </span>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => removeFile(index)}
                  aria-label="Удалить файл"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          {selectedFiles.length > 0 && (
            <div className="files-counter">{selectedFiles.length}/5 файлов</div>
          )}
        </div>
      )}
    </form>
  );
}

export default InputArea;
