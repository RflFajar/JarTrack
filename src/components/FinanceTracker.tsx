import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, query, orderBy, onSnapshot, FirebaseUser, Timestamp, handleFirestoreError, OperationType, deleteDoc, doc } from '../lib/firebase';
import { Transaction } from '../types';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Trash2, Loader2, Calendar, Tag, Info, Sparkles, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getFinanceAdvice } from '../services/geminiService';

interface FinanceTrackerProps {
  user: FirebaseUser;
}

export default function FinanceTracker({ user }: FinanceTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [sourceOrCategory, setSourceOrCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/transactions`);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !sourceOrCategory) return;

    const path = `users/${user.uid}/transactions`;
    try {
      const transactionData: any = {
        uid: user.uid,
        type,
        amount: Number(amount),
        sourceOrCategory,
        note,
        date: Timestamp.now()
      };

      if (type === 'expense') {
        transactionData.quantity = Number(quantity);
      }

      await addDoc(collection(db, path), transactionData);

      setAmount('');
      setSourceOrCategory('');
      setQuantity('1');
      setNote('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/transactions/${id}`);
    }
  };

  const generateAdvice = async () => {
    if (transactions.length === 0) return;
    setLoadingAI(true);
    try {
      const result = await getFinanceAdvice(transactions.slice(0, 20));
      setAdvice(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAI(false);
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-neutral-900/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Finance Tracker</h1>
            <p className="text-neutral-500">Pantau pemasukan dan pengeluaran Anda.</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-2xl font-semibold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-900/20"
        >
          <Plus className="w-5 h-5" />
          Tambah Transaksi
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500 mb-1">Total Pemasukan</p>
          <p className="text-2xl font-bold text-green-600">Rp {totalIncome.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500 mb-1">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-red-600">Rp {totalExpense.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-neutral-900 p-6 rounded-3xl shadow-xl shadow-neutral-900/20">
          <p className="text-sm font-medium text-neutral-400 mb-1">Saldo Saat Ini</p>
          <p className={cn(
            "text-2xl font-bold",
            balance >= 0 ? "text-white" : "text-red-400"
          )}>
            Rp {balance.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl shadow-indigo-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold">AI Finance Advice</h2>
            </div>
            <button 
              onClick={generateAdvice}
              disabled={loadingAI || transactions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all disabled:opacity-50"
            >
              {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="text-sm font-medium">Dapatkan Saran</span>
            </button>
          </div>

          {advice ? (
            <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
              <p className="text-indigo-100 leading-relaxed">{advice}</p>
            </div>
          ) : (
            <p className="text-indigo-200">Klik tombol untuk mendapatkan saran keuangan dari AI berdasarkan riwayat transaksi Anda.</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl"
          >
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-neutral-900">Tambah Transaksi Baru</h2>
                <button type="button" onClick={() => setIsAdding(false)} className="text-neutral-400 hover:text-neutral-900">
                  Tutup
                </button>
              </div>

              <div className="flex p-1 bg-neutral-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-bold transition-all",
                    type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-neutral-500"
                  )}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-bold transition-all",
                    type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-neutral-500"
                  )}
                >
                  Pemasukan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">Jumlah (Rp)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">
                    {type === 'income' ? 'Sumber' : 'Kategori'}
                  </label>
                  <input
                    type="text"
                    value={sourceOrCategory}
                    onChange={(e) => setSourceOrCategory(e.target.value)}
                    placeholder={type === 'income' ? 'Contoh: Gaji, Kiriman' : 'Contoh: Makan, Transport'}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none"
                    required
                  />
                </div>
                {type === 'expense' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-neutral-700">Kuantitas</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none"
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-neutral-700">Catatan (Opsional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all",
                  type === 'income' ? "bg-green-600 shadow-green-600/20" : "bg-red-600 shadow-red-600/20"
                )}
              >
                Simpan Transaksi
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900">Riwayat Transaksi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">Tanggal</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">Kategori/Sumber</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-neutral-600">Jumlah</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {format(t.date.toDate(), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {t.type === 'income' ? (
                        <ArrowUpCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{t.sourceOrCategory}</p>
                        {t.note && <p className="text-xs text-neutral-400">{t.note}</p>}
                        {t.quantity && t.quantity > 1 && <p className="text-xs text-neutral-500">Qty: {t.quantity}</p>}
                      </div>
                    </div>
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-bold text-right",
                    t.type === 'income' ? "text-green-600" : "text-red-600"
                  )}>
                    {t.type === 'income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(t.id!)}
                      className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-400">
                    Belum ada transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
