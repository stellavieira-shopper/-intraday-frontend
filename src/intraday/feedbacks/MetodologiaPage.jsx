function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{children}</h2>
    </div>
  )
}

function Tag({ color, children }) {
  const colors = {
    red:    { bg: '#fde8e8', text: '#b91c1c' },
    green:  { bg: '#dcfce7', text: '#15803d' },
    yellow: { bg: '#fef9c3', text: '#92400e' },
    blue:   { bg: '#dbeafe', text: '#1d4ed8' },
    gray:   { bg: 'var(--surface)', text: 'var(--text-muted)' },
    orange: { bg: '#fff7ed', text: '#c2410c' },
  }
  const c = colors[color] || colors.gray
  return (
    <span style={{ background: c.bg, color: c.text, fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function FlowStep({ num, label, desc, color }) {
  const bg = color === 'red' ? 'var(--shopper-red)' : color === 'green' ? '#16a34a' : '#64748b'
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: bg, color: '#fff' }}>{num}</div>
      <div style={{ paddingTop: 5 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  )
}

function THead({ cols }) {
  return (
    <thead>
      <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {cols.map(h => (
          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}

function TBody({ rows }) {
  return (
    <tbody>
      {rows.map((row, i) => (
        <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? '#fff' : 'var(--surface)' }}>
          {row.map((cell, j) => (
            <td key={j} style={{ padding: '10px 14px', verticalAlign: 'middle', fontSize: 13 }}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function SimpleTable({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <THead cols={headers} />
        <TBody rows={rows} />
      </table>
    </div>
  )
}

function Callout({ color, children }) {
  const c = { blue: { bg: '#eff6ff', text: '#1e40af' }, yellow: { bg: '#fefce8', text: '#854d0e' }, gray: { bg: 'var(--surface)', text: 'var(--text-muted)' } }
  const s = c[color] || c.gray
  return (
    <div style={{ background: s.bg, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: s.text, lineHeight: 1.6, marginTop: 12 }}>
      {children}
    </div>
  )
}

export default function MetodologiaPage() {
  return (
    <div className="intraday-content" style={{ maxWidth: 820, margin: '0 auto' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Como funciona o bônus de performance</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 620 }}>
          O bônus é calculado toda semana (segunda a domingo). Ele combina sua taxa individual de SLA com o desempenho da loja como um todo.
        </p>
      </div>

      {/* Fluxo */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="🔄">Fluxo do cálculo</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FlowStep num="1" label="SLA individual" desc="Sua taxa pessoal de separação dentro do tempo define em qual faixa salarial você se encaixa. Supervisores usam a taxa da loja; Team Líderes usam a taxa do turno." />
          <FlowStep num="2" label="Faixa salarial" desc="Cada faixa tem um valor base em reais. Quanto maior a taxa, maior o valor da faixa." />
          <FlowStep num="3" label="Multiplicadores da loja" color="red" desc="O valor da faixa é multiplicado pelo desempenho geral da loja (separação e completo). Se a loja vai mal, o multiplicador cai — e o bônus também." />
          <FlowStep num="4" label="Gate da loja" color="red" desc="Se a loja não atingir 80% de SLA ou 80% de Completo, todos ficam com valor zero. Não há cálculo parcial." />
          <FlowStep num="5" label="Gate de assiduidade" color="red" desc="Qualquer falta no período (injustificada ou com atestado) zera o bônus individualmente. Atrasos registrados como delay não zeram." />
          <FlowStep num="6" label="Descontos" color="red" desc="Rupturas e erros de clientes são descontados do valor calculado." />
          <FlowStep num="7" color="green" label="Valor final" desc="Aplicado o teto máximo por cargo. Esse é o valor que aparece no seu feedback semanal." />
        </div>
      </Card>

      {/* Escopo por cargo */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="🏪">Como é calculada a taxa individual por cargo</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          A taxa que entra em todo o cálculo (faixas, gates, descontos e abastecimento) varia conforme o cargo — cada um responde pelo seu escopo de atuação:
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { cargo: 'Operador', cor: '#3b82f6', escopo: 'Taxa pessoal', desc: 'O cálculo usa somente os pedidos que o próprio operador separou.' },
            { cargo: 'Team Líder', cor: '#8b5cf6', escopo: 'Taxa do turno', desc: 'O cálculo usa a taxa consolidada de todos os operadores do mesmo turno na loja.' },
            { cargo: 'Supervisor', cor: '#ec4899', escopo: 'Taxa da loja', desc: 'O cálculo usa a taxa consolidada de toda a loja, todos os turnos.' },
          ].map(({ cargo, cor, escopo, desc }) => (
            <div key={cargo} style={{ flex: '1 1 160px', borderRadius: 8, border: '1px solid var(--border)', padding: '12px 14px', borderTop: `3px solid ${cor}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>{cargo}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{escopo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Faixas + Multiplicadores juntos */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="📊">Faixas e multiplicadores — como o bônus é calculado</SectionTitle>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
          O cálculo tem duas etapas: primeiro sua taxa individual define um <strong>valor base</strong>;
          depois o desempenho da loja aplica um <strong>multiplicador</strong> sobre esse valor.
          O resultado é limitado ao teto do cargo.
        </p>

        {/* Etapa 1 — faixa base */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
          Etapa 1 — Sua taxa individual define o valor base
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          Piso mínimo: <strong>85%</strong> para a maioria das lojas (80% no Jardins).
          Supervisor usa taxa da loja; Team Líder usa taxa do turno; Operador usa taxa pessoal.
        </p>
        <SimpleTable
          headers={['Taxa individual', 'Base Operador', 'Base Team Líder', 'Base Supervisor']}
          rows={[
            [<><Tag color="red">Abaixo do piso</Tag></>, 'R$ 0', 'R$ 0', 'R$ 0'],
            ['85% – 89%', 'R$ 50', 'R$ 100', 'R$ 150'],
            ['90% – 94%', 'R$ 100', 'R$ 150', 'R$ 200'],
            [<><Tag color="green">≥ 95%</Tag></>, 'R$ 150', 'R$ 200', 'R$ 250'],
          ]}
        />

        {/* Seta */}
        <div style={{ textAlign: 'center', fontSize: 22, color: 'var(--text-muted)', margin: '18px 0' }}>↓</div>

        {/* Etapa 2 — multiplicadores */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
          Etapa 2 — A loja aplica um multiplicador sobre o valor base
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          Dois indicadores da loja definem o multiplicador final:
          separação (peso 70%) e completo (peso 30%).
          <br /><strong>Fórmula:</strong> valor = base × (0,7 × mult. separação + 0,3 × mult. completo)
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 240px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Separação da loja (peso 70%)</div>
            <SimpleTable
              headers={['Taxa separação', 'Multiplicador']}
              rows={[
                ['< piso', <Tag color="red">0,0 ×</Tag>],
                ['85% – 94%', '0,8 ×'],
                ['95% – 97%', '1,5 ×'],
                ['≥ 98%', <Tag color="green">2,0 ×</Tag>],
              ]}
            />
          </div>
          <div style={{ flex: '1 1 240px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Completo da loja (peso 30%)</div>
            <SimpleTable
              headers={['Taxa completo', 'Multiplicador']}
              rows={[
                ['< 95%', <Tag color="red">0,0 ×</Tag>],
                ['95% – 97%', '0,8 ×'],
                ['98% – 98,9%', '1,5 ×'],
                ['≥ 99%', <Tag color="green">2,0 ×</Tag>],
              ]}
            />
          </div>
        </div>

        {/* Seta */}
        <div style={{ textAlign: 'center', fontSize: 22, color: 'var(--text-muted)', margin: '4px 0 18px' }}>↓</div>

        {/* Resultado */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
          Resultado — limitado ao teto do cargo
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { cargo: 'Operador',   faixas: 'R$ 50 · R$ 100 · R$ 150', teto: 'R$ 220', cor: '#3b82f6', quando: 'Atingido a partir da faixa ≥90% com bom desempenho de loja' },
            { cargo: 'Team Líder', faixas: 'R$ 100 · R$ 150 · R$ 200', teto: 'R$ 330', cor: '#8b5cf6', quando: 'Atingido a partir da faixa ≥90% com bom desempenho de loja' },
            { cargo: 'Supervisor', faixas: 'R$ 150 · R$ 200 · R$ 250', teto: 'R$ 440', cor: '#ec4899', quando: 'Atingido a partir da faixa ≥90% com bom desempenho de loja' },
          ].map(({ cargo, faixas, teto, cor, quando }) => (
            <div key={cargo} style={{ flex: '1 1 180px', background: 'var(--surface)', borderRadius: 10, padding: '14px 18px', borderTop: `3px solid ${cor}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{cargo}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{teto}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                máximo semanal<br />
                <span style={{ opacity: 0.8 }}>Bases: {faixas}</span><br />
                <span style={{ opacity: 0.7 }}>{quando}</span>
              </div>
            </div>
          ))}
        </div>

        <Callout color="yellow">
          Se o multiplicador de completo for 0 (taxa &lt; 95%), essa parcela zera. Se o multiplicador de separação for 0 (taxa &lt; piso), o bônus vai a zero independente do completo — e o gate da loja também zera tudo se qualquer dos dois ficar abaixo de 80%.
        </Callout>

        {/* Fórmulas por cargo */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '20px 0 12px' }}>
          Fórmula completa por cargo
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              cargo: 'Operador', cor: '#3b82f6',
              taxa: 'taxa pessoal de separação',
              faixas: 'R$50 / R$100 / R$150',
              teto: 'R$ 220',
            },
            {
              cargo: 'Team Líder', cor: '#8b5cf6',
              taxa: 'taxa de separação do turno',
              faixas: 'R$100 / R$150 / R$200',
              teto: 'R$ 330',
            },
            {
              cargo: 'Supervisor', cor: '#ec4899',
              taxa: 'taxa de separação da loja',
              faixas: 'R$150 / R$200 / R$250',
              teto: 'R$ 440',
            },
          ].map(({ cargo, cor, taxa, faixas, teto }) => (
            <div key={cargo} style={{ borderRadius: 8, border: '1px solid var(--border)', borderLeft: `4px solid ${cor}`, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: cor, marginBottom: 6 }}>{cargo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Taxa individual = <strong style={{ color: 'var(--text)' }}>{taxa}</strong></div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Faixas base = <strong style={{ color: 'var(--text)' }}>{faixas}</strong></div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--surface)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', marginTop: 6, lineHeight: 1.8 }}>
                valor_bruto = faixa × (0,7 × mult_sep + 0,3 × mult_compl)<br />
                pré_gate = max(0, valor_bruto − desc_ruptura − desc_erros)<br />
                <strong>bônus = min(pré_gate, {teto})</strong> <span style={{ opacity: 0.6 }}>— zerável pelos gates</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Gates */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="🚧">Gates — o que pode zerar o bônus</SectionTitle>
        <SimpleTable
          headers={['Gate', 'Quem afeta', 'Condição', 'Efeito']}
          rows={[
            [<strong>SLA da loja</strong>, <Tag color="red">Todos na loja</Tag>, 'Separação ou Completo da loja < 80%', 'Zera o bônus de toda a loja'],
            [<strong>Assiduidade</strong>, <Tag color="yellow">Individual</Tag>, 'Falta injustificada ou com atestado no período', 'Zera só o bônus da pessoa'],
            [<><strong>Foto</strong> <Tag color="gray">Desativado</Tag></>, '—', 'Aguardando melhorias no app', 'Não está sendo aplicado'],
          ]}
        />
        <Callout color="gray">
          Atrasos registrados como "delay" ou "late arrival" não zeram o bônus.
        </Callout>
      </Card>

      {/* SLA */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="📦">O que conta para o SLA</SectionTitle>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 220px', background: '#dcfce7', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#15803d', marginBottom: 6 }}>Conta para o SLA</div>
            <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>Pedidos com tempo de entrega definido.<br />Aparecem como <strong>Dentro</strong> ou <strong>Fora</strong> do SLA.</div>
          </div>
          <div style={{ flex: '1 1 220px', background: 'var(--surface)', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Não conta para o SLA</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>Pedidos sem SLA definido — ex: <strong>pedidos agendados</strong>.<br />Aparecem no total, mas não entram na taxa.</div>
          </div>
        </div>
        <Callout color="blue">
          <strong>Fórmula:</strong> Taxa SLA = Pedidos dentro do SLA ÷ Total de pedidos com SLA × 100
        </Callout>
      </Card>

      {/* Descontos */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="📉">Descontos</SectionTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* Rupturas */}
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Rupturas</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              Calculadas pelo escopo da loja. O desconto é fixo por faixa de taxa de completo — independente do número de itens rompidos:
            </p>
            <SimpleTable
              headers={['Taxa completo loja', 'Operador', 'Team Líder', 'Supervisor']}
              rows={[
                ['< 95%', <Tag color="gray">zero pelo mult.</Tag>, <Tag color="gray">zero pelo mult.</Tag>, <Tag color="gray">zero pelo mult.</Tag>],
                ['95% – 95,9%', '−R$ 50', '−R$ 75', '−R$ 100'],
                ['96% – 96,9%', '−R$ 40', '−R$ 60', '−R$ 80'],
                ['97% – 97,9%', '−R$ 30', '−R$ 45', '−R$ 60'],
                ['98% – 98,9%', '−R$ 20', '−R$ 30', '−R$ 40'],
                ['≥ 99%', <Tag color="green">sem desconto</Tag>, <Tag color="green">sem desconto</Tag>, <Tag color="green">sem desconto</Tag>],
              ]}
            />
            <Callout color="yellow">
              Abaixo de 95% o multiplicador de completo já zera essa parcela — por isso não há desconto adicional de ruptura nessa faixa.
            </Callout>
          </div>
          {/* Erros */}
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Erros de clientes</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              Vinculados individualmente. Somente erros marcados como "Considerar" entram. O desconto é por pedido (máx. 1 por pedido):
            </p>
            <SimpleTable
              headers={['Tipo de erro', 'Desconto']}
              rows={[
                ['Normal', '−R$ 10,23'],
                ['Grave',  '−R$ 15,34'],
              ]}
            />
          </div>
        </div>

      </Card>

      {/* Abastecimento */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="📦">Componente de abastecimento <Tag color="gray">Desativado</Tag></SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          Em melhoria metodológica. Atualmente 100% do bolso é alocado em pedidos para todos os cargos e turnos.
          Em breve o componente de abastecimento será aplicado primeiro para o turno da <strong>noite</strong>,
          e caso a metodologia se estenda, passará a valer também para o turno da <strong>manhã</strong>.
        </p>
      </Card>

      {/* Teto */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="🏆">Teto semanal por cargo</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Independentemente do desempenho, existe um valor máximo que pode ser recebido por semana.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { cargo: 'Operador',   teto: 'R$ 220,00', cor: '#3b82f6' },
            { cargo: 'Team Líder', teto: 'R$ 330,00', cor: '#8b5cf6' },
            { cargo: 'Supervisor', teto: 'R$ 440,00', cor: '#ec4899' },
          ].map(({ cargo, teto, cor }) => (
            <div key={cargo} style={{ flex: '1 1 160px', background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', borderTop: `3px solid ${cor}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{cargo}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{teto}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>máximo por semana</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pedidos desconsiderados */}
      <Card style={{ marginBottom: 20, borderLeft: '4px solid var(--shopper-red)' }}>
        <SectionTitle icon="⚠️">Pedidos que podem ser desconsiderados</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          Em situações onde são identificadas <strong>instabilidades operacionais</strong> — como falhas de sistema, problemas de integração ou eventos externos — que dificultaram o cumprimento de processos de SLA e rupturas, alguns pedidos podem ser desconsiderados do cálculo.
          Nesses casos, a exclusão é aplicada manualmente e comunicada antes do fechamento da semana.
        </p>
      </Card>

      {/* Rodapé */}
      <div style={{ background: '#eff6ff', borderRadius: 12, padding: '16px 20px', fontSize: 13, color: '#1e40af', lineHeight: 1.6, marginBottom: 32 }}>
        <strong>Dúvidas?</strong> Fale com seu supervisor ou gestor. Os dados detalhados da sua semana estão na aba <strong>Feedbacks Individuais</strong>.
      </div>

    </div>
  )
}
