import styles from './App.module.css'

export function App() {
  return (
    <main className={styles.page}>
      <div className={styles.introduction}>
        <p className={styles.wordmark}>Cartoon Check</p>
        <h1 className={styles.title}>
          Adicione.
          <br />
          Marque.
          <br />
          Comemore.
        </h1>
        <p className={styles.description}>
          Uma forma simples e divertida de lembrar o que você quer comprar.
        </p>
        <p className={styles.status}>Em desenvolvimento</p>
      </div>
    </main>
  )
}
