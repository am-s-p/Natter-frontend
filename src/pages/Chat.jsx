import { useEffect, useState, useRef } from "react";
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

  // 👥 Load contacts with history
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await API.get("/users/contacts", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Error fetching contacts", err);
      }
    };
    fetchContacts();
  }, []);

  // 🔍 Global Search Logic
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [localQuery, setLocalQuery] = useState("");

  const handleGlobalSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await API.get(`/users/search?q=${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error("Search error", err);
    }
  };

  const selectSearchResult = (u) => {
    // Add to local list if not there and select
    if (!users.find(user => user._id === u._id)) {
      setUsers([u, ...users]);
    }
    setSelectedUser(u);
    setIsSearching(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(localQuery.toLowerCase())
  );

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

  // 📜 AUTO-SCROLL TO BOTTOM
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

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

  // ⚡ SOCKET LISTENERS
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      // Check for current conversation
      if (
        msg.sender === selectedUser?._id ||
        msg.receiver === selectedUser?._id
      ) {
        setMessages((prev) => {
          // 🛡️ De-duplicate: Check if message with this ID or identical content already exists
          const exists = prev.find(m => m._id === msg._id || (m.isTemp && m.content === msg.content && m.sender === msg.sender));
          if (exists) {
            // Replace temp message with real one
            return prev.map(m => (m === exists ? msg : m));
          }
          return [...prev, msg];
        });
      }

      // Mark as read if I'm the receiver of this message and it's from the person I'm talking to
      if (msg.receiver === myId && msg.sender === selectedUser?._id) {
        socket.emit("markAsRead", { senderId: msg.sender });
      }
    };

    const handleTyping = ({ sender }) => {
      // Logic for typing stays similar but we check against the actual selected user
      setTyping(true);
      setTimeout(() => setTyping(false), 2000);
    };

    const handleRead = ({ readerId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.receiver === readerId ? { ...m, isRead: true } : m))
      );
    };

    socket.on("receiveMessage", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("messagesRead", handleRead);

    return () => {
      socket.off("receiveMessage", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("messagesRead", handleRead);
    };
  }, [socket, selectedUser?._id]); // Rebuild only when socket or selected ID changes

  const sendMessage = () => {
    if (!message.trim()) return;

    const tempMsg = {
      _id: Date.now().toString(),
      sender: myId,
      receiver: selectedUser._id,
      content: message,
      createdAt: new Date().toISOString(),
      isTemp: true // Flag to identify optimistic messages
    };

    // ⚡ Optimistic Update: Add to list instantly!
    setMessages((prev) => [...prev, tempMsg]);

    socket.emit("sendMessage", {
      receiverId: selectedUser._id,
      content: message,
    });

    setMessage(""); 
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
        <div className="sidebar-header">
          <div className="brand">⚡ Natter</div>
          <button className="add-btn" onClick={() => setIsSearching(!isSearching)}>
            {isSearching ? "✕" : "+"}
          </button>
        </div>

        <div className="search-container">
          <input 
            type="text" 
            placeholder={isSearching ? "Find new users..." : "Search chats..."}
            value={isSearching ? searchQuery : localQuery}
            onChange={(e) => isSearching ? handleGlobalSearch(e.target.value) : setLocalQuery(e.target.value)}
            className="sidebar-search"
          />
        </div>

        <div className="user-list">
          {isSearching ? (
            <div className="search-results">
              {searchResults.length > 0 ? (
                searchResults.map((u) => (
                  <div key={u._id} className="user result" onClick={() => selectSearchResult(u)}>
                    {u.username}
                  </div>
                ))
              ) : (
                <div className="empty-msg">{searchQuery.length < 2 ? "Type to search..." : "No users found"}</div>
              )}
            </div>
          ) : (
            filteredUsers.map((u, index) => (
              <div
                key={u._id}
                className={`user ${selectedUser?._id === u._id ? "active" : ""}`}
                style={{ animationDelay: `${index * 0.05}s`, animation: 'fadeIn 0.4s ease forwards' }}
                onClick={() => setSelectedUser(u)}
              >
                {u.username}
              </div>
            ))
          )}
        </div>
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
                          <img src={`https://natter-backend-0p2e.onrender.com${m.attachment.url}`} alt={m.attachment.fileName} />
                        ) : m.attachment.fileType.startsWith("video/") ? (
                          <video controls src={`https://natter-backend-0p2e.onrender.com${m.attachment.url}`} />
                        ) : (
                          <a href={`https://natter-backend-0p2e.onrender.com${m.attachment.url}`} target="_blank" rel="noreferrer" className="file-attachment">
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
              <div ref={messagesEndRef} />
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