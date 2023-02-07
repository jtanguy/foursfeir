import { Link } from "@remix-run/react";

export default function Index() {
  return (
    <>
      <nav className="container-fluid">
        <ul>
          <li>
            <Link to="/">FourSFEIR</Link>
          </li>
        </ul>
      </nav>
      <main className="container">
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
          <h1>Welcome to FourSFEIR</h1>
          <ul>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/nantes">Nantes</Link>
            </li>
            <li>
              <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
                Remix Docs
              </a>
            </li>
          </ul>
        </div>
      </main>
      <footer className="container"></footer>
    </>
  );
}
