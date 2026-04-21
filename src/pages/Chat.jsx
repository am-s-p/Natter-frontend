import { useEffect, useState } from "react";
import API from "../services/api";
import { connectSocket, getSocket } from "../services/socket";

export default function Chat() {
  const token = localStorage.getItem("token");
  const myId = localStorage.getItem("userId");

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  
  // 📱 Mobile Navigation State
  const [mobileView, setMobileView] = useState("list"); // 'list' or 'chat'
  
  useEffect(() => {
    if (selectedUser) setMobileView("chat");
  }, [selectedUser]);

  // 🔐 Protect route
  useEffect(() => {
    if (!token) {
      window.location.href = "/";
    }
  }, []);

  // 🔌 Connect socket ONCE
  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
  }, [token]);

  const socket = getSocket();

  // 👥 Load users ONCE
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await API.get("/users");
      setUsers(res.data.filter((u) => u._id !== myId));
    };
    fetchUsers();
  }, []);

  // Mouse Tracking State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const x = (e.clientX - window.innerWidth / 2) * 0.15;
    const y = (e.clientY - window.innerHeight / 2) * 0.15;
    setMousePos({ x, y });
  };

  // 🌙 Theme State
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // 📜 Load chat history when user changes
  useEffect(() => {
  if (!selectedUser) return;

  const loadMessages = async () => {
    try {
      const res = await API.get(`/chat/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(res.data);
      if (socket) socket.emit("markAsRead", { senderId: selectedUser._id });
    } catch (err) {
      console.error("Error loading messages", err);
    }
  };

  loadMessages();
  }, [selectedUser, socket]);

  // ⚡ SOCKET LISTENERS (NO LOOP)
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (
        msg.sender === selectedUser?._id ||
        msg.receiver === selectedUser?._id
      ) {
        setMessages((prev) => [...prev, msg]);
        if (msg.sender === selectedUser?._id) {
          socket.emit("markAsRead", { senderId: selectedUser._id });
        }
      }
    };

    const handleTyping = ({ sender }) => {
      if (sender === selectedUser?._id) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1500);
      }
    };

    const handleRead = ({ readerId }) => {
      if (readerId === selectedUser?._id) {
        setMessages((prev) =>
          prev.map((m) => (m.receiver === readerId ? { ...m, isRead: true } : m))
        );
      }
    };

    socket.on("receiveMessage", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("messagesRead", handleRead);

    return () => {
      socket.off("receiveMessage", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("messagesRead", handleRead);
    };
  }, [socket, selectedUser]);

  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("sendMessage", {
      receiverId: selectedUser._id,
      content: message,
    });

    setMessage(""); // Message clears. The socket receive listener will append the message automatically!
  };

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // 📂 File Upload Handler
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/chat/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // After upload, send message with attachment
      socket.emit("sendMessage", {
        receiverId: selectedUser._id,
        content: "", // Optionally add text with file, but here we just send the file
        attachment: res.data,
      });
    } catch (err) {
      console.error("Upload failed", err);
      alert("File upload failed.");
    } finally {
      setUploading(false);
      e.target.value = null; // Reset input
    }
  };

  if (!socket) return <div>Connecting...</div>;

  return (
    <div className="app auth-bg" onMouseMove={handleMouseMove}>
      {/* Global Header Controls */}
      <div className="header-controls">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

      <div 
        className="orb orb-1" 
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      <div 
        className="orb orb-2" 
        style={{ transform: `translate(${-mousePos.x * 1.5}px, ${-mousePos.y * 1.5}px)` }}
      />
      
      <div className={`sidebar ${mobileView === "chat" ? "mobile-hidden" : ""}`}>
        <div className="brand">⚡ Natter</div>

        {users.map((u, index) => (
          <div
            key={u._id}
            className={`user ${selectedUser?._id === u._id ? "active" : ""}`}
            style={{ animationDelay: `${index * 0.05}s`, animation: 'fadeIn 0.4s ease forwards' }}
            onClick={() => setSelectedUser(u)}
          >
            {u.username}
          </div>
        ))}
      </div>

      <div className={`chat ${!selectedUser || mobileView === "list" ? "mobile-hidden" : ""}`}>
        {selectedUser ? (
          <>
            <div className="header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button className="back-btn" onClick={() => setMobileView("list")}>
                  ← Back
                </button>
                <span>{selectedUser.username}</span>
              </div>
            </div>

            <div className="messages">
              {messages.map((m, i) => {
                const isSent = m.sender === myId;
                return (
                  <div
                    key={i}
                    className={isSent ? "bubble sent" : "bubble received"}
                  >
                    <div className="bubble-content">
                      {m.content}
                    </div>
                    {m.attachment && (
                      <div className="attachment-preview">
                        {m.attachment.fileType.startsWith("image/") ? (
                          <img src={`http://localhost:5005${m.attachment.url}`} alt={m.attachment.fileName} />
                        ) : m.attachment.fileType.startsWith("video/") ? (
                          <video controls src={`http://localhost:5005${m.attachment.url}`} />
                        ) : (
                          <a href={`http://localhost:5005${m.attachment.url}`} target="_blank" rel="noreferrer" className="file-attachment">
                            <span className="file-icon">📄</span>
                            <span>{m.attachment.fileName}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {isSent && (
                      <span className={`seen-check ${m.isRead ? "read" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '-8px'}}>
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {typing && (
              <div className="typing">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
                <span>Typing...</span>
              </div>
            )}

            <div className="input">
              <label className="attach-btn">
                {uploading ? "..." : "+"}
                <input type="file" hidden onChange={handleFileChange} />
              </label>
              <input
                value={message}
                placeholder="Type a message..."
                onChange={(e) => {
                  setMessage(e.target.value);
                  socket.emit("typing", {
                    receiverId: selectedUser._id,
                  });
                }}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="empty">Select a chat</div>
        )}
      </div>
    </div>
  );
}