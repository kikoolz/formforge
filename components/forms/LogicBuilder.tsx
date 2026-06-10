'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { FormField, FormCondition, ConditionOperator, LogicAction } from '@/types'

interface Props {
  formId: string
  fields: FormField[]
  conditions: FormCondition[]
  onConditionsChange: (conditions: FormCondition[]) => void
  open: boolean
  onClose: () => void
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

const ACTIONS: { value: LogicAction; label: string }[] = [
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
  { value: 'require', label: 'Make required' },
  { value: 'make_readonly', label: 'Make read-only' },
]

export default function LogicBuilder({
  formId,
  fields,
  conditions,
  onConditionsChange,
  open,
  onClose,
}: Props) {
  const [localConditions, setLocalConditions] = useState<FormCondition[]>(conditions)

  useEffect(() => {
    setLocalConditions(conditions)
  }, [conditions])

  if (!open) return null

  async function addCondition() {
    if (fields.length < 2) {
      toast.error('Need at least 2 fields to create a condition')
      return
    }

    const sourceField = fields[0]
    const targetField = fields[1]

    const res = await fetch(`/api/forms/${formId}/conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_field_id: sourceField.id,
        target_field_id: targetField.id,
        action: 'show',
        operator: 'equals',
        value: '',
      }),
    })

    const result = await res.json()
    if (result.data) {
      const updated = [...localConditions, result.data]
      setLocalConditions(updated)
      onConditionsChange(updated)
      toast.success('Condition added')
    } else {
      toast.error('Failed to add condition')
    }
  }

  async function updateCondition(
    conditionId: string,
    updates: Partial<FormCondition>,
  ) {
    const res = await fetch(
      `/api/forms/${formId}/conditions/${conditionId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      },
    )

    if (!res.ok) {
      toast.error('Failed to update condition')
      return
    }

    setLocalConditions((prev) => {
      const updated = prev.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c,
      )
      onConditionsChange(updated)
      return updated
    })
  }

  async function deleteCondition(conditionId: string) {
    const res = await fetch(
      `/api/forms/${formId}/conditions/${conditionId}`,
      { method: 'DELETE' },
    )

    if (!res.ok) {
      toast.error('Failed to delete condition')
      return
    }

    const updated = localConditions.filter((c) => c.id !== conditionId)
    setLocalConditions(updated)
    onConditionsChange(updated)
    toast.success('Condition removed')
  }

  function getFieldLabel(fieldId: string) {
    return fields.find((f) => f.id === fieldId)?.label || 'Unknown field'
  }

  const needsValue = (op: ConditionOperator) =>
    !['is_empty', 'is_not_empty'].includes(op)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-16">
      <div className="bg-[#16161E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Form Logic</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {localConditions.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-12">
              No conditions yet. Add rules to show/hide fields based on other field values.
            </p>
          )}

          {localConditions.map((condition) => (
            <div
              key={condition.id}
              className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Rule
                </span>
                <button
                  onClick={() => deleteCondition(condition.id)}
                  className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-start gap-2 flex-wrap">
                {/* If */}
                <span className="text-xs text-zinc-500 mt-2.5">If</span>

                {/* Source field (trigger) */}
                <select
                  value={condition.source_field_id}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      source_field_id: e.target.value,
                    })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={condition.operator}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      operator: e.target.value as ConditionOperator,
                    })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {/* Value */}
                {needsValue(condition.operator) && (
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(condition.id, {
                        value: e.target.value,
                      })
                    }
                    placeholder="Value"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-32"
                  />
                )}
              </div>

              <div className="flex items-start gap-2 flex-wrap">
                {/* Then */}
                <span className="text-xs text-zinc-500 mt-2.5">Then</span>

                {/* Action */}
                <select
                  value={condition.action}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      action: e.target.value as LogicAction,
                    })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>

                {/* Target field */}
                <select
                  value={condition.target_field_id}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      target_field_id: e.target.value,
                    })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-zinc-600">
                When &ldquo;{getFieldLabel(condition.source_field_id)}&rdquo;{' '}
                {condition.operator === 'equals' && 'equals'}
                {condition.operator === 'not_equals' && 'does not equal'}
                {condition.operator === 'contains' && 'contains'}
                {condition.operator === 'greater_than' && 'is greater than'}
                {condition.operator === 'less_than' && 'is less than'}
                {condition.operator === 'is_empty' && 'is empty'}
                {condition.operator === 'is_not_empty' && 'is not empty'}{' '}
                {needsValue(condition.operator) && (
                  <span className="text-zinc-400">&ldquo;{condition.value}&rdquo;</span>
                )}
                ,{' '}
                {condition.action === 'show' && 'show'}
                {condition.action === 'hide' && 'hide'}
                {condition.action === 'require' && 'require'}
                {condition.action === 'make_readonly' && 'make read-only'}{' '}
                &ldquo;{getFieldLabel(condition.target_field_id)}&rdquo;
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
          <span className="text-[10px] text-zinc-600">
            {localConditions.length} rule{localConditions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
