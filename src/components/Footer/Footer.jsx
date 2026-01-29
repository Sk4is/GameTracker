import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__left">
          <span className="footer__brand">GameTracker</span>
          <span className="footer__sep">•</span>
          <span className="footer__copy">© {year}</span>
        </div>

        <div className="footer__right">
          <a
            href="https://github.com/Sk4is/GameTracker"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sk4is
          </a>
          <span className="footer__sep">•</span>
          <a
            href="https://www.ubisoft.com/es-es/game/rainbow-six/siege"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rainbow Six Siege
          </a>
        </div>
      </div>
    </footer>
  );
}
