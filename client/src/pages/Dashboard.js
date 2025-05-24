"use client";

import { useState, useRef, useEffect } from "react";
import "./Dashboard.css";
import MessageList from "../components/MessageList";
import InputArea from "../components/InputArea";

function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(`conv_${Date.now()}`);
  const contentRef = useRef(null);

  // Use environment variable directly
  const API_URL = process.env.SERVER_URL || "http://localhost:5000";

  // Инициализация пользователя при загрузке компонента
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Получаем или создаем ID пользователя
        let userId = localStorage.getItem("userId");
        if (!userId) {
          userId = `user_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
          localStorage.setItem("userId", userId);
        }

        // Регистрируем пользователя на сервере
        const response = await fetch(`${API_URL}/api/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          console.error("Failed to register user:", await response.text());
        }
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    };

    initializeUser();
  }, []);

  // Function to add a new message
  const addMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  // Scroll down when new messages are added
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle message sending
  const handleSendMessage = async (text, files) => {
    if (!text.trim() && (!files || files.length === 0)) return;

    // Add user message
    addMessage({
      id: Date.now(),
      role: "user",
      content: text,
      files: files
        ? files.map((file) => ({ name: file.name, type: file.type }))
        : [],
      timestamp: new Date().toISOString(),
    });

    setLoading(true);

    // Add loading indicator
    const loadingId = Date.now() + 1;
    addMessage({
      id: loadingId,
      role: "system",
      content: "Анализируем данные...",
      isLoading: true,
      timestamp: new Date().toISOString(),
    });

    try {
      // Create FormData for sending files
      const formData = new FormData();
      formData.append("text", text);

      // Add files
      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      }

      // Add conversation history and ID
      const conversationHistory = messages
        .filter((msg) => !msg.isLoading)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      formData.append("history", JSON.stringify(conversationHistory));
      formData.append("conversationId", conversationId);

      // Add user ID if available
      const userId = localStorage.getItem("userId") || `user_${Date.now()}`;
      formData.append("userId", userId);

      // Send request to API
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received response from server:", data);

      // Remove loading message
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== loadingId)
      );

      // Add system response
      addMessage({
        id: Date.now() + 2,
        role: "system",
        content: data.response,
        parsedFiles: data.parsedFiles || [],
        visualizations: data.visualizations || [],
        timestamp: new Date().toISOString(),
      });

      // Store conversation ID for future messages
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error("Error sending request:", error);

      // Remove loading message
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== loadingId)
      );

      // Add error message
      addMessage({
        id: Date.now() + 2,
        role: "system",
        content: `An error occurred while processing the request: ${error.message}`,
        error: true,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="messages-container" ref={contentRef}>
        <MessageList messages={messages} />
      </div>
      <div className="input-container">
        <InputArea onSendMessage={handleSendMessage} loading={loading} />
      </div>
    </div>
  );
}

export default Dashboard;
