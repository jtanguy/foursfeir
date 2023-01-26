export default function Login() {
  return (
    <main className="container">
      <article className="grid">
        <div>
          <hgroup>
            <h1>Log in</h1>
            <h2>Using google</h2>
          </hgroup>
          <form>
            <button type="button" className="primary">
              Login with Google
            </button>
          </form>
        </div>
        <div className="hero--axolotl-blue"></div>
      </article>
    </main>
  );
}
