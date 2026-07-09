"use client";

import React, { useState } from "react";
import { ListFilter, ChevronLeft, ChevronRight, Hash, Clock } from "lucide-react";
import { GlassPanel } from "./GlassPanel";

export interface LedgerTx {
  id: string;
  sender_wallet: string;
  receiver_wallet: string;
  amount: number;
  memo: string;
  tx_hash: string;
  status: "successful" | "pending" | "failed" | string;
  timestamp: string;
}

interface LedgerOfTruthProps {
  transactions: LedgerTx[];
}

export function LedgerOfTruth({ transactions }: LedgerOfTruthProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Pagination bounds calculation
  const totalPages = Math.ceil(transactions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTxs = transactions.slice(startIndex, startIndex + itemsPerPage);

  const formatHash = (hash: string) => {
    if (!hash) return "N/A";
    return hash.length > 16 
      ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` 
      : hash;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "N/A";
    }
  };

  return (
    <GlassPanel className="p-6 space-y-4">
      
      {/* LEDGER HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-neon-secondary animate-pulse" />
          <h3 className="font-display font-bold uppercase tracking-wider text-white">LEDGER_OF_TRUTH</h3>
        </div>
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">
          Page {currentPage} of {totalPages} ({transactions.length} records)
        </span>
      </div>

      {/* TACTICAL TABULAR GRID */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[10px] text-gray-400 border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-gray-600 font-bold uppercase text-[9px] tracking-widest">
              <th className="pb-3 pr-4">Tx Hash / Job ID</th>
              <th className="pb-3 pr-4">Client Sender</th>
              <th className="pb-3 pr-4">Value (CSPR)</th>
              <th className="pb-3 pr-4">State</th>
              <th className="pb-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/2">
            {paginatedTxs.length > 0 ? (
              paginatedTxs.map((tx) => {
                const isSuccess = tx.status.toLowerCase() === "successful";
                const isPending = tx.status.toLowerCase() === "pending" || tx.status.toLowerCase() === "active";
                
                return (
                  <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-3.5 pr-4 text-neon-secondary flex items-center gap-1.5 font-semibold">
                      <Hash className="w-3 h-3 text-gray-700" />
                      <span className="group-hover:text-white transition-colors">
                        {formatHash(tx.tx_hash || tx.id)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-gray-500">
                      {tx.sender_wallet.length > 16 
                        ? `${tx.sender_wallet.substring(0, 8)}...` 
                        : tx.sender_wallet}
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-white">
                      {tx.amount.toFixed(2)} CSPR
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold ${
                        isSuccess 
                          ? "bg-status-success/10 text-status-success border border-status-success/20" 
                          : isPending 
                          ? "bg-status-processing/10 text-status-processing border border-status-processing/20 animate-pulse" 
                          : "bg-status-alert/10 text-status-alert border border-status-alert/20"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-gray-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(tx.timestamp)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-600 font-bold uppercase tracking-wider">
                  No registered balance transfers or logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION HUD CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="py-1.5 px-3 rounded border border-white/5 bg-void-elevated/40 text-gray-500 hover:text-neon-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="py-1.5 px-3 rounded border border-white/5 bg-void-elevated/40 text-gray-500 hover:text-neon-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </GlassPanel>
  );
}

export default LedgerOfTruth;