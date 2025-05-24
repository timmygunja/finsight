import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import "./Navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Prevent scrolling when menu is open
    document.body.style.overflow = isMenuOpen ? "auto" : "hidden";
  };

  // Close menu when clicking on a link
  const handleLinkClick = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = "auto";
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="/" className="navbar-logo">
          Finsight
        </a>

        {/* Desktop Menu */}
        <div className="navbar-menu">
          <a href="/" className="navbar-item">
            Дашборд
          </a>
          <a href="/history" className="navbar-item">
            История
          </a>
          <a href="/profile" className="navbar-item">
            Профиль
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu Modal */}
        <div className={`mobile-menu-modal ${isMenuOpen ? "open" : ""}`}>
          <div className="mobile-menu-content">
            <a href="/" className="mobile-menu-item" onClick={handleLinkClick}>
              Дашборд
            </a>
            <a
              href="/history"
              className="mobile-menu-item"
              onClick={handleLinkClick}
            >
              История
            </a>
            <a
              href="/profile"
              className="mobile-menu-item"
              onClick={handleLinkClick}
            >
              Профиль
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
