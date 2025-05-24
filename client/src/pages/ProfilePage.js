"use client";

import { useState } from "react";
import "./ProfilePage.css";

function ProfilePage() {
  const [user, setUser] = useState({
    username: "user123",
    email: "user@example.com",
    apiKey: "••••••••••••••••",
    preferences: {
      useAll: true,
      chatGPT4: true,
      deepseek: false,
      mistral: false,
      llama: false,
    },
  });

  const [showApiKey, setShowApiKey] = useState(false);

  const toggleApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const togglePreference = (preference) => {
    setUser({
      ...user,
      preferences: {
        ...user.preferences,
        [preference]: !user.preferences[preference],
      },
    });
  };

  return (
    <div className="profile-page">
      <h1>Профиль пользователя</h1>

      <div className="profile-section">
        <h2>Информация об аккаунте</h2>
        <div className="profile-info">
          <div className="profile-field">
            <label>Имя пользователя</label>
            <div className="profile-value">{user.username}</div>
          </div>

          <div className="profile-field">
            <label>Email</label>
            <div className="profile-value">{user.email}</div>
          </div>

          <div className="profile-field">
            <label>API ключ</label>
            <div className="profile-value api-key">
              {showApiKey ? "sk_test_12345abcdef" : "••••••••••••••••"}
              <button className="toggle-api-btn" onClick={toggleApiKey}>
                {showApiKey ? "Скрыть" : "Показать"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2>Используемые модели</h2>
        <div className="profile-preferences">
          <div className="ai-models-container">
            <div className="preference-item">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={user.preferences.useAll}
                  onChange={() => togglePreference("useAll")}
                />
                <span className="toggle-slider"></span>
              </label>
              <div className="model-info">
                <span>Использовать все</span>
              </div>
            </div>

            <div className="preference-item">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={user.preferences.chatGPT4}
                  onChange={() => togglePreference("chatGPT4")}
                />
                <span className="toggle-slider"></span>
              </label>
              <div className="model-info">
                <span>ChatGPT 4.0</span>
              </div>
            </div>

            <div className="preference-item">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={user.preferences.deepseek}
                  onChange={() => togglePreference("deepseek")}
                />
                <span className="toggle-slider"></span>
              </label>
              <div className="model-info">
                <span>DeepSeek</span>
              </div>
            </div>

            <div className="preference-item">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={user.preferences.mistral}
                  onChange={() => togglePreference("mistral")}
                />
                <span className="toggle-slider"></span>
              </label>
              <div className="model-info">
                <span>mistral</span>
              </div>
            </div>

            <div className="preference-item">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={user.preferences.llama}
                  onChange={() => togglePreference("llama")}
                />
                <span className="toggle-slider"></span>
              </label>
              <div className="model-info">
                <span>Llama</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button className="save-profile-btn">Сохранить изменения</button>
        <button className="reset-profile-btn">Сбросить настройки</button>
      </div>
    </div>
  );
}

export default ProfilePage;
