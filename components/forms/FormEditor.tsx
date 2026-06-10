"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Reorder } from "framer-motion";
import { Sparkles, Loader2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import type { Form, FormField, FormCondition, FieldType } from "@/types";
import InteractivePdfViewer from "./InteractivePdfViewer";
import LogicBuilder from "./LogicBuilder";

interface Props {
  initialForm: Form & { form_fields: FormField[] };
}

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: "text", label: "Text", icon: "T" },
  { value: "textarea", label: "Paragraph", icon: "\u00b6" },
  { value: "email", label: "Email", icon: "@" },
  { value: "phone", label: "Phone", icon: "\u260e" },
  { value: "date", label: "Date", icon: '\u{d7}"' },
  { value: "number", label: "Number", icon: "#" },
  { value: "checkbox", label: "Checkbox", icon: "\u2611" },
  { value: "radio", label: "Choice", icon: "\u25c9" },
  { value: "select", label: "Dropdown", icon: "\u2261" },
  { value: "signature", label: "Signature", icon: "\u270e" },
  { value: "file", label: "File", icon: "\u{1f4c1}" },
];

export default function FormEditor({ initialForm }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [fields, setFields] = useState<FormField[]>(initialForm.form_fields);
  const [saving, setSaving] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"thumbnails" | "properties">(
    "thumbnails",
  );
  const [detecting, setDetecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conditions, setConditions] = useState<FormCondition[]>(
    initialForm.form_conditions || [],
  );
  const [showLogicBuilder, setShowLogicBuilder] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const saveChanges = useCallback(
    async (updatedFields: FormField[]) => {
      setSaving(true);
      try {
        await Promise.all(
          updatedFields.map((field, index) =>
            fetch(`/api/forms/${form.id}/fields/${field.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...field, position: index }),
            }),
          ),
        );
      } catch {
        toast.error("Failed to save fields");
      } finally {
        setSaving(false);
      }
    },
    [form.id],
  );

  const updateField = useCallback(
    (fieldId: string, updates: Partial<FormField>) => {
      setFields((prev) => {
        const updated = prev.map((f) =>
          f.id === fieldId ? { ...f, ...updates } : f,
        );
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => saveChanges(updated), 1000);
        return updated;
      });
    },
    [saveChanges],
  );

  async function saveFormMetadata(updates: Partial<Form>) {
    setSaving(true);
    try {
      await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function addField(type: FieldType = "text") {
    const response = await fetch(`/api/forms/${form.id}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "New Field",
        field_type: type,
        required: false,
        position: fields.length,
      }),
    });
    const { data } = await response.json();
    if (data) {
      setFields((prev) => [...prev, data]);
      setSelectedFieldId(data.id);
      setRightTab("properties");
    }
  }

  async function deleteField(fieldId: string) {
    await fetch(`/api/forms/${form.id}/fields/${fieldId}`, {
      method: "DELETE",
    });
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
      setRightTab("thumbnails");
    }
    toast.success("Field removed");
  }

  async function runAiDetection() {
    setDetecting(true);
    try {
      const res = await fetch(`/api/forms/${form.id}/detect-fields`, {
        method: "POST",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "AI detection failed");
        return;
      }

      const newFields = result.data?.fields || [];
      if (newFields.length === 0) {
        toast.error("No fields detected. Try adding fields manually.");
        return;
      }

      // Reload form to get saved fields
      const formRes = await fetch(`/api/forms/${form.id}`);
      const { data: updatedForm } = await formRes.json();
      if (updatedForm?.form_fields) {
        setFields(updatedForm.form_fields);
      }

      toast.success(`Detected ${newFields.length} fields`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Detection failed";
      toast.error(msg);
    } finally {
      setDetecting(false);
    }
  }

  async function publishForm() {
    const response = await fetch(`/api/forms/${form.id}/publish`, {
      method: "POST",
    });
    const { data } = await response.json();
    setForm((prev) => ({ ...prev, is_published: data.is_published }));
    toast.success(data.is_published ? "Form published!" : "Form unpublished");
  }

  return (
    <div className="h-screen bg-[#0A0A0F] text-white flex flex-col overflow-hidden">
      {/* ===== TOP ACTION BAR ===== */}
      <header className="flex items-center justify-between h-12 px-4 border-b border-white/8 bg-[#0D0D14] shrink-0">
        <div className="flex items-center gap-1">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => router.push("/dashboard")}
          >
            Home
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            onClick={async () => {
              if (!form.is_published) {
                const res = await fetch(`/api/forms/${form.id}/publish`, {
                  method: "POST",
                });
                const { data } = await res.json();
                setForm((prev) => ({
                  ...prev,
                  is_published: data.is_published,
                }));
              }
              window.open(`/f/${form.public_slug}`, "_blank");
            }}
          >
            Preview
          </button>
          <button
            onClick={() => setShowLogicBuilder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Logic
          </button>
          <button
            onClick={runAiDetection}
            disabled={detecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-50"
          >
            {detecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {detecting ? "Detecting..." : "AI-Powered Recognition"}
          </button>
        </div>

        <div className="text-sm font-medium text-zinc-300 truncate max-w-[300px]">
          {form.title}
        </div>

        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-zinc-500">Saving...</span>}
          <button
            onClick={publishForm}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              form.is_published
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {form.is_published ? "Published" : "Publish"}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-[#16161E] border border-white/10 rounded-xl p-2 shadow-2xl z-50 space-y-1">
                <button
                  onClick={() => {
                    saveFormMetadata({ title: form.title });
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Edit settings
                </button>
                <button
                  onClick={() => {
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Version history
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ===== LEFT FIELD TYPE PALETTE ===== */}
        <aside className="w-12 border-r border-white/8 bg-[#0D0D14] flex flex-col items-center py-2 gap-1 shrink-0 overflow-y-auto">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.value}
              onClick={() => addField(ft.value)}
              title={ft.label}
              className="w-8 h-8 flex items-center justify-center text-xs text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {ft.icon}
            </button>
          ))}
        </aside>

        {/* ===== CENTER PDF AREA ===== */}
        <main className="flex-1 bg-[#0D0D14] overflow-hidden relative">
          {form.original_pdf_url ? (
            form.form_type === "web_form" ? (
              <iframe
                src={form.original_pdf_url}
                className="w-full h-full border-0"
                title="Original PDF"
              />
            ) : (
              <InteractivePdfViewer
                pdfUrl={form.original_pdf_url}
                fields={fields}
                mode="preview"
                brandColor={form.branding_color}
                selectedFieldId={selectedFieldId}
                onFieldClick={(id) => {
                  setSelectedFieldId(id);
                  setRightTab("properties");
                }}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              <p>No PDF preview available</p>
            </div>
          )}

          {/* Page navigation overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 text-xs text-zinc-400">
              <button className="hover:text-white transition-colors">
                &lsaquo;
              </button>
              <span>Page 1 of 1</span>
              <button className="hover:text-white transition-colors">
                &rsaquo;
              </button>
            </div>
          </div>
        </main>

        {/* ===== RIGHT PANEL ===== */}
        <aside className="w-64 border-l border-white/8 bg-[#0D0D14] flex flex-col shrink-0">
          {/* Panel tabs */}
          <div className="flex border-b border-white/8">
            <button
              onClick={() => setRightTab("thumbnails")}
              className={`flex-1 py-2.5 text-xs transition-colors ${
                rightTab === "thumbnails"
                  ? "text-white border-b-2 border-indigo-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Pages
            </button>
            <button
              onClick={() => setRightTab("properties")}
              className={`flex-1 py-2.5 text-xs transition-colors ${
                rightTab === "properties"
                  ? "text-white border-b-2 border-indigo-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Fields
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {/* Thumbnails */}
            {rightTab === "thumbnails" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-white/8 bg-white/5 overflow-hidden aspect-[210/297]">
                  <div className="h-full w-full bg-zinc-800/50 flex items-center justify-center text-zinc-600 text-xs">
                    Page 1
                  </div>
                </div>
              </div>
            )}

            {/* Fields list + properties */}
            {rightTab === "properties" && (
              <div className="space-y-2">
                {selectedField ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Field Properties
                      </h3>
                      <button
                        onClick={() => deleteField(selectedField.id)}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Label
                      </label>
                      <input
                        type="text"
                        value={selectedField.label}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            label: e.target.value,
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Type
                      </label>
                      <select
                        value={selectedField.field_type}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            field_type: e.target.value as FieldType,
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(selectedField.field_type === "select" ||
                      selectedField.field_type === "radio") && (
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">
                          Options
                        </label>
                        <textarea
                          value={selectedField.options?.join("\n") || ""}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              options: e.target.value
                                .split("\n")
                                .filter(Boolean),
                            })
                          }
                          placeholder="One per line"
                          rows={4}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            required: e.target.checked,
                          })
                        }
                        className="rounded border-white/20"
                      />
                      Required
                    </label>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 text-center py-8">
                    Select a field on the PDF to edit its properties
                  </div>
                )}

                <div className="pt-3 border-t border-white/8">
                  <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    All Fields
                  </h3>
                  <Reorder.Group
                    axis="y"
                    values={fields}
                    onReorder={(newOrder) => {
                      setFields(newOrder);
                      saveChanges(newOrder);
                    }}
                    className="space-y-1"
                  >
                    {fields.map((field) => (
                      <Reorder.Item key={field.id} value={field}>
                        <button
                          onClick={() => {
                            setSelectedFieldId(field.id);
                            setRightTab("properties");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                            selectedFieldId === field.id
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <span className="font-medium">{field.label}</span>
                          <span className="text-zinc-600 ml-2">
                            {field.field_type}
                          </span>
                        </button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      <LogicBuilder
        formId={form.id}
        fields={fields}
        conditions={conditions}
        onConditionsChange={setConditions}
        open={showLogicBuilder}
        onClose={() => setShowLogicBuilder(false)}
      />
    </div>
  );
}
