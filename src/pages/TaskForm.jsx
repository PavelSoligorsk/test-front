import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

export default function TaskForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  
  const [taskData, setTaskData] = useState({
    task_class: 1,
    topic_number: 1,
    content: '',
    answer: '',
    is_open_answer: true,
    options: [],
    hint: '',
    solution: ''
  });

  const [optionsInput, setOptionsInput] = useState('');

  useEffect(() => {
    if (isEditing) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`https://tests-production-46d5.up.railway.app/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const task = res.data;
      setTaskData(task);
      if (task.options) {
        setOptionsInput(task.options.join('; '));
      }
    } catch (err) {
      alert('Ошибка загрузки задания');
      navigate('/admin/tasks');
    }
  };

  const handleOptionsChange = (value) => {
    setOptionsInput(value);
    const optionsArray = value.split(';').map(opt => opt.trim()).filter(opt => opt !== '');
    setTaskData({ ...taskData, options: optionsArray });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!taskData.is_open_answer && taskData.options.length === 0) {
      alert('Для заданий с выбором ответа необходимо указать варианты');
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...taskData,
        options: taskData.is_open_answer ? null : taskData.options
      };

      if (isEditing) {
        await axios.put(`https://tests-production-46d5.up.railway.app/admin/tasks/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Задание успешно обновлено!');
      } else {
        await axios.post('https://tests-production-46d5.up.railway.app/admin/tasks', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Задание успешно создано!');
      }
      
      navigate('/admin/tasks');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Ошибка при сохранении задания';
      alert(Array.isArray(errorMessage) ? errorMessage.map(e => e.msg).join('\n') : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Шапка */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="mb-4 text-slate-600 hover:text-slate-800 font-medium flex items-center gap-2"
          >
            ← Назад к списку заданий
          </button>
          
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl">
            <h1 className="text-4xl font-black mb-2 tracking-tighter">
              {isEditing ? '✏️ РЕДАКТИРОВАНИЕ ЗАДАНИЯ' : '🆕 СОЗДАНИЕ НОВОГО ЗАДАНИЯ'}
            </h1>
            <p className="text-slate-400">
              {isEditing ? 'Измените параметры задания' : 'Заполните форму для создания задания'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Форма */}
          <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Класс и тема */}
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-600 ml-1">Класс (1-11)</span>
                  <input 
                    type="number"
                    min="1"
                    max="11"
                    required
                    className="w-full p-4 mt-1 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                    value={taskData.task_class}
                    onChange={e => setTaskData({...taskData, task_class: parseInt(e.target.value)})}
                  />
                </label>
                
                <label className="block">
                  <span className="text-sm font-bold text-slate-600 ml-1">Номер темы</span>
                  <input 
                    type="number"
                    min="1"
                    required
                    className="w-full p-4 mt-1 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                    value={taskData.topic_number}
                    onChange={e => setTaskData({...taskData, topic_number: parseInt(e.target.value)})}
                  />
                </label>
              </div>

              {/* Содержание задания */}
              <label className="block">
                <span className="text-sm font-bold text-slate-600 ml-1">Текст задания</span>
                <textarea 
                  required
                  className="w-full p-4 mt-1 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all h-40 resize-none"
                  placeholder="Введите текст задания..."
                  value={taskData.content}
                  onChange={e => setTaskData({...taskData, content: e.target.value})}
                />
              </label>

              {/* Правильный ответ */}
              <label className="block">
                <span className="text-sm font-bold text-slate-600 ml-1">Правильный ответ</span>
                <input 
                  required
                  className="w-full p-4 mt-1 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                  placeholder="Введите правильный ответ"
                  value={taskData.answer}
                  onChange={e => setTaskData({...taskData, answer: e.target.value})}
                />
              </label>

              {/* Тип ответа */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
                <input 
                  type="checkbox"
                  id="is_open"
                  className="w-5 h-5 rounded accent-blue-600"
                  checked={taskData.is_open_answer}
                  onChange={e => {
                    setTaskData({...taskData, is_open_answer: e.target.checked});
                    if (e.target.checked) {
                      setOptionsInput('');
                      setTaskData(prev => ({...prev, options: []}));
                    }
                  }}
                />
                <label htmlFor="is_open" className="text-sm font-bold text-slate-700">
                  Открытый ответ (без вариантов выбора)
                </label>
              </div>

              {/* Варианты ответов */}
              {!taskData.is_open_answer && (
                <label className="block">
                  <span className="text-sm font-bold text-slate-600 ml-1">
                    Варианты ответов (разделяйте точкой с запятой)
                  </span>
                  <input 
                    required={!taskData.is_open_answer}
                    className="w-full p-4 mt-1 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                    placeholder="Вариант 1; Вариант 2; Вариант 3"
                    value={optionsInput}
                    onChange={e => handleOptionsChange(e.target.value)}
                  />
                  {taskData.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {taskData.options.map((opt, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </label>
              )}

              {/* Подсказка */}
              <label className="block">
                <span className="text-sm font-bold text-slate-600 ml-1">Подсказка (опционально)</span>
                <textarea 
                  className="w-full p-4 mt-1 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all h-24 resize-none"
                  placeholder="Подсказка для учеников..."
                  value={taskData.hint}
                  onChange={e => setTaskData({...taskData, hint: e.target.value})}
                />
              </label>

              {/* Решение */}
              <label className="block">
                <span className="text-sm font-bold text-slate-600 ml-1">Решение (опционально)</span>
                <textarea 
                  className="w-full p-4 mt-1 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all h-32 resize-none"
                  placeholder="Подробное решение..."
                  value={taskData.solution}
                  onChange={e => setTaskData({...taskData, solution: e.target.value})}
                />
              </label>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-800 text-white py-4 rounded-xl font-black hover:bg-slate-900 transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? 'СОХРАНЕНИЕ...' : (isEditing ? '💾 ОБНОВИТЬ' : '✨ СОЗДАТЬ')}
                </button>
                <button 
                  type="button"
                  onClick={() => navigate('/admin/tasks')}
                  className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  ОТМЕНА
                </button>
              </div>
            </form>
          </div>

          {/* Предпросмотр */}
          <div className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-xl h-fit sticky top-6">
            <h3 className="text-xl font-black mb-6 text-slate-800 flex items-center gap-2">
              👁️ ПРЕДПРОСМОТР
              <span className="text-xs font-normal text-slate-400 ml-auto">как увидят ученики</span>
            </h3>
            
            <div className="space-y-4">
              {/* Заголовок */}
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                  {taskData.task_class} класс
                </span>
                <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
                  Тема {taskData.topic_number}
                </span>
              </div>
              
              {/* Текст задания */}
              <div className="p-6 bg-slate-50 rounded-2xl">
                <p className="text-slate-800 text-lg">
                  {taskData.content || 'Текст задания появится здесь...'}
                </p>
              </div>
              
              {/* Варианты ответов или поле ввода */}
              {taskData.is_open_answer ? (
                <div className="p-6 bg-purple-50 rounded-2xl border-2 border-purple-200">
                  <p className="text-sm font-bold text-purple-800 mb-3">📝 Открытый ответ</p>
                  <input 
                    type="text"
                    placeholder="Введите ваш ответ..."
                    className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl"
                    disabled
                  />
                </div>
              ) : (
                <div className="p-6 bg-orange-50 rounded-2xl border-2 border-orange-200">
                  <p className="text-sm font-bold text-orange-800 mb-3">🎯 Выберите правильный вариант</p>
                  <div className="space-y-2">
                    {taskData.options.length > 0 ? (
                      taskData.options.map((option, idx) => (
                        <label key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-orange-200">
                          <input type="radio" name="preview" className="w-4 h-4 accent-orange-600" disabled />
                          <span>{option}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-4">Варианты ответов появятся здесь</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Правильный ответ (для превью) */}
              {taskData.answer && (
                <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                  <p className="text-sm font-bold text-green-800 mb-1">✓ Правильный ответ:</p>
                  <p className="text-green-900">{taskData.answer}</p>
                </div>
              )}
              
              {/* Подсказка */}
              {taskData.hint && (
                <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                  <p className="text-sm font-bold text-yellow-800 mb-1">💡 Подсказка:</p>
                  <p className="text-yellow-900">{taskData.hint}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}