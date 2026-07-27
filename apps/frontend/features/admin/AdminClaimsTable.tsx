"use client";

import { useState } from "react";
import { Table, Drawer, Button, Input, Space } from "antd";
import { FiSearch, FiX } from "react-icons/fi";
import { addClaimNote, updateClaimStatus } from "@/lib/admin-actions";
import { AdminButton, StatusBadge } from "@/components/admin/AdminPrimitives";
import type { Prisma } from "@fargo/database/client";
import { useFormStatus } from "react-dom";

type ClaimWithDetails = Prisma.BusinessClaimGetPayload<{
  include: {
    business: { select: { businessName: true; slug: true; owner: { select: { name: true; email: true } } } };
    claimant: { select: { name: true; email: true } };
    reviewedBy: { select: { name: true; email: true } };
    notes: {
      orderBy: { createdAt: "asc" };
      select: {
        id: true;
        content: true;
        isAdminNote: true;
        attachmentUrl: true;
        attachmentName: true;
        attachments: true;
        createdAt: true;
        author: { select: { name: true; role: true } };
      };
    };
  };
}>;

const statuses = ["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;

function SubmitButton({ children, tone }: { children: React.ReactNode, tone: "default" | "success" }) {
  const { pending } = useFormStatus();
  return <AdminButton tone={tone} disabled={pending}>{pending ? "Saving..." : children}</AdminButton>;
}

export function AdminClaimsTable({ claims, translations: t }: { claims: ClaimWithDetails[], translations: Record<string, string> }) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  
  const selectedClaim = claims.find((c) => c.id === selectedClaimId) || null;

  const columns = [
    {
      title: t["fields.business"] || "Business",
      dataIndex: "business",
      key: "business",
      sorter: (a: ClaimWithDetails, b: ClaimWithDetails) => a.business.businessName.localeCompare(b.business.businessName),
      render: (business: ClaimWithDetails["business"]) => (
        <div>
          <strong className="block">{business.businessName}</strong>
          <span className="text-xs text-slate-500">{business.slug}</span>
        </div>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            placeholder={t.searchBusiness || "Search business"}
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button type="primary" onClick={() => confirm()} icon={<FiSearch />} size="small" style={{ width: 90 }}>
              {t.search || "Search"}
            </Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>
              {t.reset || "Reset"}
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value: any, record: ClaimWithDetails) =>
        record.business.businessName.toLowerCase().includes(value.toLowerCase()) ||
        record.business.slug.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: t["fields.claimant"] || "Claimant",
      key: "claimant",
      render: (_: any, record: ClaimWithDetails) => (
        <div>
          <span className="block">{record.claimantName}</span>
          <span className="text-xs text-slate-400">{record.claimantEmail}</span>
        </div>
      ),
      sorter: (a: ClaimWithDetails, b: ClaimWithDetails) => a.claimantName.localeCompare(b.claimantName),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            placeholder={t.searchClaimant || "Search claimant"}
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button type="primary" onClick={() => confirm()} icon={<FiSearch />} size="small" style={{ width: 90 }}>
              {t.search || "Search"}
            </Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>
              {t.reset || "Reset"}
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value: any, record: ClaimWithDetails) =>
        record.claimantName.toLowerCase().includes(value.toLowerCase()) ||
        record.claimantEmail.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: t["fields.status"] || "Status",
      dataIndex: "status",
      key: "status",
      filters: statuses.map(s => ({ text: s, value: s })),
      onFilter: (value: any, record: ClaimWithDetails) => record.status === value,
      render: (status: any) => <StatusBadge status={status} />,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: ClaimWithDetails, b: ClaimWithDetails) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: Date) => <span className="text-sm text-slate-400">{new Date(date).toLocaleDateString("de-DE")}</span>,
    },
    {
      title: t["fields.actions"] || "Actions",
      key: "actions",
      render: (_: any, record: ClaimWithDetails) => (
        <Button onClick={() => setSelectedClaimId(record.id)} type="primary" ghost size="small">
          View Details
        </Button>
      ),
    }
  ];

  return (
    <>
      <div className="rounded-xl overflow-hidden border admin-section">
        <Table 
          columns={columns} 
          dataSource={claims} 
          rowKey="id"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      <Drawer
        title={<span className="text-xl font-bold">{t.claimDetails || "Claim Details"}</span>}
        placement="right"
        width={500}
        onClose={() => setSelectedClaimId(null)}
        open={!!selectedClaim}
        closeIcon={<FiX className="text-xl" />}
      >
        {selectedClaim && (
          <div className="space-y-8 pb-10">
            {/* Overview */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 border-b pb-2">{t.overview || "Overview"}</h3>
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div><span className="block text-slate-500 mb-1">{t["fields.business"] || "Business"}</span><strong>{selectedClaim.business.businessName}</strong></div>
                <div><span className="block text-slate-500 mb-1">{t["fields.status"] || "Status"}</span><StatusBadge status={selectedClaim.status} /></div>
                <div><span className="block text-slate-500 mb-1">{t["fields.claimant"] || "Claimant"} Name</span><span>{selectedClaim.claimantName}</span></div>
                <div><span className="block text-slate-500 mb-1">{t["fields.claimant"] || "Claimant"} Email</span><span>{selectedClaim.claimantEmail}</span></div>
                <div className="col-span-2"><span className="block text-slate-500 mb-1">{t.officialBusinessEmail || "Official Business Email"}</span><span className="text-sky-500">{selectedClaim.officialBusinessEmail || "-"}</span></div>
              </div>
            </div>

            {/* Status Update */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 border-b pb-2">{t.moderation || "Moderation"}</h3>
              {selectedClaim.status === "UNDER_REVIEW" ? (
                <form action={updateClaimStatus} className="grid gap-3 bg-slate-500/5 p-4 rounded-xl border">
                  <input type="hidden" name="id" value={selectedClaim.id} />
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.newStatus || "New Status"}</label>
                    <select name="status" defaultValue={selectedClaim.status} className="admin-input h-10 w-full min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400">
                      {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t.decisionReason || "Decision Reason"}</label>
                    <textarea name="decisionReason" required minLength={3} placeholder={t.decisionReasonPlaceholder || "Provide reason for decision..."} className="admin-input w-full min-h-20 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
                  </div>
                  <SubmitButton tone="success">{t.saveStatus || "Save Status"}</SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-slate-500">
                  {t.noActionAvailable ? t.noActionAvailable.replace("{status}", selectedClaim.status) : `No moderation action is available. This claim is already ${selectedClaim.status}.`}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 border-b pb-2">{t.notesAndMessages || "Notes & Messages"}</h3>
              
              <div className="space-y-3 mb-6">
                {selectedClaim.notes.map((note) => (
                  <div key={note.id} className={`rounded-xl p-3 text-sm border ${note.isAdminNote ? "border-sky-500/30 bg-sky-500/10" : "bg-slate-500/5"}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-bold ${note.isAdminNote ? "text-sky-600 dark:text-sky-400" : ""}`}>
                        {note.isAdminNote ? "Admin" : note.author.name || "User"}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(note.createdAt).toLocaleString("de-DE")}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    
                    {/* Legacy single attachment */}
                    {note.attachmentUrl && (!note.attachments || !Array.isArray(note.attachments) || note.attachments.length === 0) && (
                      <a href={note.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sky-500 hover:text-sky-600 text-xs bg-sky-500/10 px-2 py-1 rounded">
                        📎 {note.attachmentName}
                      </a>
                    )}
                    
                    {/* Multiple attachments */}
                    {note.attachments && Array.isArray(note.attachments) && note.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {note.attachments.map((att: any, idx: number) => (
                          <a key={idx} href={att.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-600 text-xs bg-sky-500/10 px-2 py-1 rounded">
                            📎 {att.name || `Attachment ${idx + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {!selectedClaim.notes.length && <p className="text-sm text-slate-500 text-center py-4">{t.noNotes || "No notes yet."}</p>}
              </div>

              <form action={addClaimNote} className="grid gap-3">
                <input type="hidden" name="claimId" value={selectedClaim.id} />
                <textarea name="content" required minLength={1} placeholder={t.decisionReasonPlaceholder || "Send a message or request documents..."} className="admin-input w-full min-h-20 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
                <SubmitButton tone="default">{t.sendMessage || "Send Message"}</SubmitButton>
              </form>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
