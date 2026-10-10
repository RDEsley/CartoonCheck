import { Link } from 'react-router'
import { AboutPage } from './AboutPage'
import { contactEmail, maintainer, repositoryUrl } from './info'

export function TermsScreen() {
  return (
    <AboutPage title="Termos de uso" updated>
      <p>
        Ao usar o Cartoon Check, no navegador ou instalado no aparelho, você
        concorda com estes termos. Se não concordar, basta não usar.
      </p>
      <h2>1. O que é o Cartoon Check</h2>
      <p>
        É um aplicativo gratuito de listas de compras e de desejos, criado e
        mantido por {maintainer}, pessoa física, sem fins lucrativos. Ele
        funciona no seu aparelho, sem conta e sem servidor de dados.
      </p>
      <h2>2. Uso</h2>
      <p>
        O uso é gratuito e livre para fins pessoais e lícitos. Você é
        responsável pelo que escreve, pelas fotos e pelos links que adiciona às
        suas listas.
      </p>
      <h2>3. Seus dados ficam com você</h2>
      <p>
        Listas, itens, fotos e preferências ficam guardados somente no seu
        aparelho. Por isso <strong>não temos como recuperar</strong> o que for
        perdido: limpar os dados do navegador, desinstalar o app ou trocar de
        aparelho apaga as listas. Guarde um backup em{' '}
        <Link to="/app/settings/backup">Backup dos seus dados</Link>.
      </p>
      <h2>4. Preços e conversões</h2>
      <p>
        Preços, totais e conversões de moeda são calculados a partir do que você
        digita, inclusive a cotação. Eles servem de apoio para se organizar e
        não substituem o valor cobrado pela loja.
      </p>
      <h2>5. Doações</h2>
      <p>
        O app oferece, de forma opcional, a possibilidade de doar qualquer valor
        por Pix. As doações vão diretamente para {maintainer}, são voluntárias,
        não dão direito a nenhuma contrapartida e não liberam funções: o app é o
        mesmo para quem doa e para quem não doa. Se você doou por engano,
        escreva para <a href={`mailto:${contactEmail}`}>{contactEmail}</a> que o
        valor é devolvido.
      </p>
      <h2>6. Responsabilidade</h2>
      <p>
        O app é oferecido “como está”, sem garantia de disponibilidade nem de
        que estará livre de falhas. Na medida permitida pela lei, o
        desenvolvedor não responde por prejuízos decorrentes do uso, como a
        perda de listas guardadas no aparelho.
      </p>
      <h2>7. Código aberto</h2>
      <p>
        O código-fonte é público, sob licença MIT, em{' '}
        <a href={repositoryUrl} target="_blank" rel="noreferrer">
          github.com/RDEsley/CartoonCheck
        </a>
        .
      </p>
      <h2>8. Privacidade, mudanças e contato</h2>
      <p>
        O tratamento de dados está na{' '}
        <Link to="/app/about/privacy">Política de privacidade</Link>. Estes
        termos podem ser atualizados; a data no topo indica a versão em vigor.
        Aplica-se a legislação brasileira. Dúvidas ou pedidos:{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    </AboutPage>
  )
}
