import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, updateDoc, FirebaseUser, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { User, Mail, Calendar, Users, Briefcase, Save, Loader2, CheckCircle2, UserCircle } from 'lucide-react';
import { calculateAge, cn } from '../lib/utils';

interface ProfileProps {
  user: FirebaseUser;
}

export default function Profile({ user }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    gender: '' as 'Male' | 'Female' | 'Other' | '',
    birthDate: '',
    status: '' as 'Single' | 'Married' | '',
    occupation: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          setFormData({
            displayName: data.displayName || '',
            gender: data.gender || '',
            birthDate: data.birthDate || '',
            status: data.status || '',
            occupation: data.occupation || ''
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        gender: formData.gender || null,
        status: formData.status || null
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const age = formData.birthDate ? calculateAge(formData.birthDate) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-neutral-900/20">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">User Profile</h1>
          <p className="text-neutral-500">Kelola informasi pribadi Anda.</p>
        </div>
      </header>

      <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-8">
        <div className="flex items-center gap-6 pb-8 border-b border-neutral-100">
          <div className="w-24 h-24 bg-neutral-100 rounded-3xl flex items-center justify-center text-neutral-400">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-3xl object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserCircle className="w-16 h-16" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{formData.displayName || 'User'}</h2>
            <p className="text-neutral-500 flex items-center gap-2">
              <Mail className="w-4 h-4" /> {user.email}
            </p>
            {age !== null && (
              <p className="text-neutral-900 font-medium mt-1">Usia: {age} Tahun</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
              placeholder="Masukkan nama"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Jenis Kelamin
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none transition-all appearance-none bg-white"
            >
              <option value="">Pilih Jenis Kelamin</option>
              <option value="Male">Laki-laki</option>
              <option value="Female">Perempuan</option>
              <option value="Other">Lainnya</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Tanggal Lahir
            </label>
            <input
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none transition-all appearance-none bg-white"
            >
              <option value="">Pilih Status</option>
              <option value="Single">Single</option>
              <option value="Married">Menikah</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Pekerjaan
            </label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
              placeholder="Contoh: Mahasiswa, Karyawan, dll"
            />
          </div>

          <div className="md:col-span-2 pt-4">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                success 
                  ? "bg-green-500 text-white shadow-green-500/20" 
                  : "bg-neutral-900 text-white shadow-neutral-900/20 hover:bg-neutral-800"
              )}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Berhasil Disimpan
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Simpan Profil
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
