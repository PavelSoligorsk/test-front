import React, { useEffect, useState } from 'react';
import { fetchStudentMe, updateStudentProfile } from './api';
import ProfileTab from './ProfileTab';
import StudentPageLoading from './StudentPageLoading';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', telegram: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentMe()
      .then((profileRes) => {
        setProfile(profileRes);
        setEditForm({
          first_name: profileRes.user.first_name || '',
          last_name: profileRes.user.last_name || '',
          phone: profileRes.user.phone || '',
          telegram: profileRes.user.tg_username || '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateStudentProfile({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        tg_username: editForm.telegram,
      });
      setProfile(prev => ({ ...prev, user: res }));
      alert('Данные сохранены!');
    } catch (err) {
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) return <StudentPageLoading variant="profile" />;

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8">
      <ProfileTab
        profile={profile}
        editForm={editForm}
        setEditForm={setEditForm}
        handleUpdateProfile={handleUpdateProfile}
        saving={saving}
      />
    </main>
  );
}
