import { Database, FileBarChart, ListChecks, Receipt, ShoppingCart, Sparkles, TrendingUp, Undo2, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDiscountEngine } from '../hooks/useDiscountEngine';
import ActiveRulesPanel from './ActiveRulesPanel';
import CartTable from './CartTable';
import CartUploader from './CartUploader';
import CheckoutSummary from './CheckoutSummary';
import ErrorBanner from './ErrorBanner';
import ReportGenerator from './ReportGenerator';
import RuleBuilder from './RuleBuilder';
import RuleEditor from './RuleEditor';
import RuleUploader from './RuleUploader';
import Toasts from './Toasts';
import ChannelPricingOptimizer from './ChannelPricingOptimizer';

const Section = ({ icon, title, children, right }: { icon: ReactNode; title: string; children: ReactNode; right?: ReactNode }) => (
  <section className="card"><div className="flex items-start justify-between gap-2"><h2 className="card-title">{icon}{title}</h2>{right}</div>{children}</section>
);

export default function Dashboard() {
  const e = useDiscountEngine();
  return (
    <div className="min-h-screen">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div><p className="text-lg font-bold tracking-tight"><span className="text-accent-500">Opptra</span> · Discount Engine</p></div>
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1" data-testid="session-status">{e.rules.length} rules · {e.items.length} items · {e.generated ? 'priced' : 'not priced yet'}</span>
            <button className="btn-accent !py-1.5" onClick={e.loadSample}><Database className="h-4 w-4" />Load sample data</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {e.error && <ErrorBanner message={e.error} onDismiss={() => e.setError(null)} />}
        {e.prevItems && (
          <div role="status" className="flex items-center justify-between rounded-xl border border-navy-100 bg-navy-50 p-3 text-sm">
            <span>Cart replaced.</span><button className="btn-ghost !py-1" onClick={e.undoCart}><Undo2 className="h-4 w-4" />Undo</button>
          </div>)}

        <Section icon={<Upload className="h-5 w-5 text-accent-500" />} title="1 · Data upload">
          <div className="grid gap-6 md:grid-cols-2">
            <RuleUploader onFile={e.importRules} loading={e.busy === 'rules'} report={e.ruleReport} onDownloadRejected={() => e.downloadRejected('rules')} />
            <CartUploader onFile={e.importCart} loading={e.busy === 'cart'} report={e.cartReport} onDownloadRejected={() => e.downloadRejected('cart')} />
          </div>
        </Section>

        <Section icon={<Sparkles className="h-5 w-5 text-accent-500" />} title="2 · AI rule builder">
          <RuleBuilder loading={e.busy === 'nl'} message={e.nlMessage} onParse={e.parseNl} />
        </Section>

        {e.editor && <RuleEditor e={e} />}

        <Section icon={<ListChecks className="h-5 w-5 text-accent-500" />} title={`3 · Active rules (${e.rules.length})`}>
          <ActiveRulesPanel rules={e.rules} result={e.result} onEdit={e.startEdit} onDelete={e.deleteRule} onAdd={e.startAdd} />
        </Section>

        <Section icon={<ShoppingCart className="h-5 w-5 text-accent-500" />} title={`4 · Cart items (${e.items.length})`}>
          <CartTable result={e.result} generated={e.generated} />
        </Section>

        <Section icon={<Receipt className="h-5 w-5 text-accent-500" />} title="5 · Pricing summary">
          <CheckoutSummary result={e.result} generated={e.generated} generatedAt={e.generatedAt} onGenerate={e.generateFinal} />
        </Section>

        <Section icon={<TrendingUp className="h-5 w-5 text-accent-500" />} title="6 · Channel commission & profit optimizer">
          <ChannelPricingOptimizer items={e.result.items} />
        </Section>

        <Section icon={<FileBarChart className="h-5 w-5 text-accent-500" />} title="7 · Report generation">
          <ReportGenerator e={e} />
        </Section>
      </main>
      <Toasts toasts={e.toasts} onDismiss={e.dismissToast} />
    </div>
  );
}
