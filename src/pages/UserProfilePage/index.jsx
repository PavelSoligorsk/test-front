import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../shared/config';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
        const token = session?.token || session?.access_token;
        const headers = { Authorization: `Bearer ${token}` };
        const [profileRes, historyRes] = await Promise.all([
          axios.get(`${API_URL}/admin/users/${userId}/profile`, { headers }),
          axios.get(`${API_URL}/admin/users/${userId}/history`, { headers })
        ]);
        setProfile(profileRes.data);
        setHistory(historyRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) return <div className="p-20 text-center font-black uppercase">Загрузка...</div>;
  if (!profile) return <div className="p-20 text-center font-black uppercase text-red-500">Ошибка</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <button onClick={() => navigate('/admin')} className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-2">
        ← Назад в админку
      </button>
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">
          {profile.first_name} {profile.last_name}
        </h1>
        <p className="text-[10px] font-black text-slate-400 mt-2">@{profile.username} • {profile.role}</p>
        {profile.phone && <p className="text-sm text-slate-500 mt-4">{profile.phone}</p>}
        {profile.tg_username && <p className="text-sm text-slate-500">{profile.tg_username}</p>}
      </div>
      {history.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">История тестов</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {history.map((item, i) => (
              <div key={i} className="p-6 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{item.test_title}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">{item.completed_at}</p>
                </div>
                <div className="text-sm font-black">{item.score}/{item.max}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

