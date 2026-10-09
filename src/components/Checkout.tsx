import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { checkPromo, useStore } from '../data/store'
import type { Payment, ProductType } from '../types'
import { money } from '../lib/format'
import { Button, Input, Modal, cx } from './ui'

export interface CheckoutProduct {
  type: ProductType
  refId?: string
  label: string
  meta?: Record<string, string>
  amount: number
}

/** Оплата (ТЗ п.29, 54–56): Kaspi / карта, промокод, после Success доступ открывается автоматически. */
export function Checkout({ product, open, onClose, onPaid }: { product: CheckoutProduct | null; open: boolean; onClose: () => void; onPaid?: (p: Payment) => void }) {
  const { db, pay } = useStore()
  const [method, setMethod] = useState<'kaspi' | 'card'>('kaspi')
  const [code, setCode] = useState('')
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null)
  const [err, setErr] = useState('')
  const [stage, setStage] = useState<'form' | 'processing' | 'done'>('form')
  const [paid, setPaid] = useState<Payment | null>(null)
  if (!product) return null
  const total = Math.max(0, product.amount - (promo?.discount ?? 0))

  const close = () => {
    setStage('form')
    setPromo(null)
    setCode('')
    setErr('')
    onClose()
  }

  return (
    <Modal open={open} onClose={close} title={stage === 'done' ? 'Оплата прошла' : 'Оплата'}>
      {stage === 'done' && paid ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={34} />
          </div>
          <p className="mt-3 font-display text-xl font-semibold">Success</p>
          <p className="mt-1 text-sm text-muted">{product.label}</p>
          <div className="mt-4 space-y-1 rounded-2xl bg-surface-2 p-4 text-left text-sm">
            <p className="flex justify-between"><span className="text-muted">ID платежа</span><b>{paid.id}</b></p>
            <p className="flex justify-between"><span className="text-muted">Сумма</span><b>{money(paid.amount)}</b></p>
            <p className="flex justify-between"><span className="text-muted">Способ</span><b>{paid.method === 'kaspi' ? 'Kaspi' : 'Банковская карта'}</b></p>
          </div>
          <p className="mt-3 text-xs text-muted">Чек отправлен на e-mail. Доступ открыт автоматически.</p>
          <Button className="mt-5 w-full" size="lg" onClick={() => { close(); onPaid?.(paid) }}>
            Готово
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-hero p-4 text-on-hero lux-grain">
            <p className="text-xs uppercase tracking-widest opacity-70">К оплате</p>
            <p className="mt-1 font-display text-3xl font-semibold">{money(total)}</p>
            {promo && <p className="text-xs opacity-80"><s>{money(product.amount)}</s> · промокод {promo.code} −{money(promo.discount)}</p>}
            <p className="mt-2 text-sm opacity-90">{product.label}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['kaspi', 'card'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cx('flex items-center gap-2 rounded-2xl border-2 p-3 text-left text-sm font-semibold transition', method === m ? 'border-accent bg-surface-2' : 'border-line')}
              >
                {m === 'kaspi' ? <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f14635] text-xs font-black text-white">K</span> : <CreditCard size={22} />}
                {m === 'kaspi' ? 'Kaspi' : 'Карта'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Промокод (например BOSS20)" />
            <Button
              variant="secondary"
              onClick={() => {
                const r = checkPromo(db, code, product.type, product.amount)
                if (r.error) {
                  setErr(r.error)
                  setPromo(null)
                } else {
                  setErr('')
                  setPromo({ code: r.promo!.code, discount: r.discount })
                }
              }}
            >
              Применить
            </Button>
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}

          <Button
            className="w-full"
            size="lg"
            disabled={stage === 'processing'}
            onClick={() => {
              setStage('processing')
              setTimeout(() => {
                const p = pay({ type: product.type, refId: product.refId, label: product.label, meta: product.meta }, total, method, promo?.code)
                setPaid(p)
                setStage('done')
              }, 900)
            }}
          >
            {stage === 'processing' ? 'Обработка платежа…' : `Оплатить ${money(total)}`}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
            <ShieldCheck size={13} /> Демо-режим: деньги не списываются. Kaspi Pay / Epay подключим на запуске.
          </p>
        </div>
      )}
    </Modal>
  )
}
