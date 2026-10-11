import { Link } from 'react-router'
import { AboutPage } from './AboutPage'
import { contactEmail, maintainer } from './info'

export function PrivacyScreen() {
  return (
    <AboutPage title="Política de privacidade" updated>
      <p>
        O Cartoon Check não tem conta, não tem servidor de dados, não tem
        anúncios e não usa cookies de rastreamento nem ferramentas de análise de
        audiência. Esta política explica o que acontece com os seus dados.
      </p>
      <h2>1. Quem é o responsável</h2>
      <p>
        {maintainer}, pessoa física, criador e mantenedor do app. Contato:{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
      <h2>2. O que fica no seu aparelho</h2>
      <p>
        Seu nome e sticker ou foto de perfil, suas listas, itens, preços, links,
        fotos, histórico, preferências e rascunhos ficam guardados{' '}
        <strong>somente no seu aparelho</strong>, no armazenamento do navegador.
        Nada disso é enviado para nós nem para terceiros. As fotos são reduzidas
        no próprio aparelho antes de serem guardadas.
      </p>
      <p>
        O app instalado guarda também uma cópia de si mesmo para funcionar sem
        internet. Ele conta, também só no aparelho, quantas vezes foi aberto,
        apenas para mostrar o convite de apoio uma única vez.
      </p>
      <h2>3. Backups</h2>
      <p>
        O arquivo de backup é criado no seu aparelho e fica onde você decidir
        guardar. Ele contém suas listas e fotos: cuide dele como cuida das suas
        outras coisas pessoais.
      </p>
      <h2>4. Hospedagem</h2>
      <p>
        Os arquivos do app são entregues pela Vercel, que registra dados
        técnicos de acesso, como endereço IP, data, hora e navegador, para
        manter o serviço funcionando e seguro. Esses registros não são usados
        para identificar você e não incluem o conteúdo das suas listas.
      </p>
      <h2>5. Links e doações</h2>
      <p>
        Os links que você adiciona aos itens abrem sites de terceiros, com
        políticas próprias. A doação é feita no app do seu banco, por Pix: o
        Cartoon Check não coleta dados de pagamento e não fica sabendo quem
        doou. Como em qualquer Pix, o recebedor vê no próprio extrato o nome de
        quem pagou. Veja os <Link to="/app/about/terms">Termos de uso</Link>.
      </p>
      <h2>6. Seus direitos</h2>
      <p>
        A Lei Geral de Proteção de Dados (Lei 13.709/2018) garante, entre
        outros, o direito de acessar, corrigir e eliminar dados. Como tudo fica
        no seu aparelho, você mesmo faz isso: edite ou apague no app, exporte em
        Backup ou limpe os dados do site no navegador. Para qualquer outro
        pedido, use o e-mail acima.
      </p>
      <h2>7. Mudanças</h2>
      <p>
        Esta política pode ser atualizada; a data no topo indica a versão em
        vigor.
      </p>
    </AboutPage>
  )
}
