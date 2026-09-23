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
          <FlowStep num="4" label="Gate da loja" color="red" desc="Se a loja não atingir 85% de SLA ou 85% de Completo (80% para Pamplona), todos ficam com valor zero. Não há cálculo parcial." />
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
            [<strong>SLA da loja</strong>, <Tag color="red">Todos na loja</Tag>, 'Separação ou Completo da loja < 85% (80% para Pamplona)', 'Zera o bônus de toda a loja'],
            [<strong>Assiduidade</strong>, <Tag color="yellow">Individual</Tag>, 'Falta injustificada ou com atestado no período', 'Zera só o bônus da pessoa'],
            [<><strong>Foto</strong> <Tag color="orange">Ativo</Tag></>, <Tag color="red">Todos na loja</Tag>, 'Taxa de foto da loja < 90%', '−40% no bônus de toda a loja'],
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
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Erros de clientes <Tag color="green">Ativo desde W29/2026</Tag></div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              Desconto sobre o bônus pela taxa de erros. Somente erros marcados como "Considerar" entram. Escopo: <strong>TEO individual</strong> (Operador) · <strong>TEC do turno</strong> (TL) · <strong>TEC da loja</strong> (Supervisor). Faixas diferenciadas a partir de W39/2026:
            </p>
            <SimpleTable
              headers={['Desconto', 'Operador', 'TL', 'Supervisor']}
              rows={[
                ['−15%',        '> 0% – 0,99%', '> 0% – 0,49%', '> 0% – 0,49%'],
                ['−25%',        '1% – 1,99%',   '0,5% – 0,99%', '0,5% – 0,99%'],
                ['−50%',        '2% – 2,99%',   '1% – 1,99%',   '1% – 1,99%'],
                ['−75%',        '3% – 3,99%',   '2% – 2,99%',   '2% – 2,99%'],
                ['Zera o bônus','≥ 4%',          '≥ 3%',          '≥ 3%'],
              ]}
            />
          </div>
        </div>

      </Card>

      {/* Abastecimento */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="📦">Componente de abastecimento <Tag color="green">Ativo desde W29/2026</Tag></SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          O bônus é dividido em dois bolsos — <strong>pedidos</strong> e <strong>abastecimento</strong> — conforme o turno e o cargo:
        </p>
        <SimpleTable headers={['Cargo', 'Turno', 'Bolso pedidos', 'Bolso abastecimento']} rows={[
          ['Operador / Team Líder', 'Manhã · Tarde', '100%', '0%'],
          ['Operador / Team Líder', 'Noite', '40%', '60%'],
          ['Supervisor', 'Todos', '50%', '50%'],
        ]} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16, lineHeight: 1.6 }}>
          <strong>Como funciona o tempo esperado?</strong> Cada tipo de SKU tem uma velocidade de abastecimento calibrada com base na média histórica de todas as dark stores, levando em conta as realidades operacionais de cada tipo de produto.
          A partir da quantidade de itens abastecidos por tipo (mercearia, FLV, congelado/refrigerado), calculamos quantas horas
          aquela carga <em>deveria</em> ter levado — esse é o <strong>tempo esperado</strong>. O tempo real é o que o operador efetivamente levou.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          <strong>Score diário — lógica binária:</strong> o resultado de cada indicador é 0 ou 1, não há meio-termo.
          Se o operador terminou dentro do tempo esperado → <strong>individual = 1</strong>; se não → 0.
          Se o turno inteiro terminou dentro do tempo esperado → <strong>coletivo = 1</strong>; se não → 0.
          O score do dia combina os dois: <strong>60% individual + 40% coletivo</strong>.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          O <strong>score semanal</strong> é a média dos dias em que a pessoa participou ativamente (gate: abasteceu ≥ 10% dos itens do turno naquele dia).
          Dias abaixo do gate não entram na média. O score semanal determina o <strong>tier de pagamento</strong> do bolso:
        </p>
        <SimpleTable headers={['Score semanal', 'Pagamento do bolso']} rows={[
          ['< 70%', '0%'],
          ['70% – 79%', '60%'],
          ['80% – 89%', '80%'],
          ['90% – 96%', '95%'],
          ['≥ 97%', '100%'],
        ]} />
      </Card>

      {/* Detratores — Perdas */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle icon="📦">Detratores — Perdas <Tag color="blue">A partir de W39/2026</Tag></SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          Perdas e ajustes lançados incorretamente no sistema geram desconto sobre a bonificação.
          O desconto é calculado cruzando a <strong>taxa de erro</strong> com o <strong>volume total de lançamentos</strong> do ciclo — porque um volume alto de falhas absolutas causa impacto operacional maior mesmo quando a taxa percentual parece baixa.
          Operadores e Team Líderes respondem pelos <strong>próprios lançamentos individualmente</strong>. O Supervisor responde pelos lançamentos da <strong>loja como um todo</strong>.
        </p>
        {/* Matriz */}
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Taxa de erro</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Até 10<br /><span style={{ fontWeight: 400, fontSize: 10, fontStyle: 'italic' }}>Baixo volume</span></th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>11 – 30<br /><span style={{ fontWeight: 400, fontSize: 10, fontStyle: 'italic' }}>Volume médio</span></th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>31 – 100<br /><span style={{ fontWeight: 400, fontSize: 10, fontStyle: 'italic' }}>Alto volume</span></th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Acima de 100<br /><span style={{ fontWeight: 400, fontSize: 10, fontStyle: 'italic' }}>Volume extremo</span></th>
              </tr>
            </thead>
            <tbody>
              {[
                ['< 3%',      '0%',             '0%',  '0%',  '0%'],
                ['3% – 10%',  '0% (isento)',    '10%', '20%', '35%'],
                ['11% – 30%', '10%',            '20%', '35%', '55%'],
                ['31% – 50%', '20%',            '35%', '55%', '75%'],
                ['> 50%',     '30%',            '55%', '75%', '75%'],
              ].map(([taxa, ...vals], i) => (
                <tr key={i} style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? '#fff' : 'var(--surface)' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 600 }}>{taxa}</td>
                  {vals.map((v, j) => {
                    const isIsento = v === '0% (isento)'
                    const isZero = v === '0%'
                    const color = isZero || isIsento ? 'var(--text-muted)' : v === '75%' ? '#b91c1c' : v === '55%' ? '#c2410c' : '#92400e'
                    return (
                      <td key={j} style={{ padding: '9px 12px', textAlign: 'center', fontWeight: isZero || isIsento ? 400 : 700, color }}>
                        {isIsento ? <Tag color="green">isento</Tag> : `−${v}`}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          <strong>Trava de volume absoluto:</strong> quem cometer <strong>10 ou mais erros</strong> no ciclo perde a isenção de 0% e recebe desconto mínimo de <strong>10%</strong>, mesmo que a taxa percentual seja inferior a 3%.
        </div>
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
