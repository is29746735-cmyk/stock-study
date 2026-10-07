export default function ComingSoon({ title, Icon }) {
  return (
    <section className="coming-soon">
      <Icon size={40} weight="light" />
      <h1>{title}</h1>
      <p>곧 만들 기능이에요.</p>
    </section>
  )
}
