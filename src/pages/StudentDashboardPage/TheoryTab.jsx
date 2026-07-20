import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, XCircle } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import TheoryAIChat from '../../components/TheoryAIChat';
import TopicCard from './TopicCard';

export default function TheoryTab({
  theoryTopics, theoryLoading,
  selectedTopic, selectedSection, theoryContent,
  showSectionModal, sectionsForModal,
  loadingTheoryByTopicSection,
  handleTopicClick, handleBackToTopics,
  setShowSectionModal, fetchTheoryByTopicSection, setSelectedTopic,
}) {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><Library size={20} className="text-white" /></div>
          <div><h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Теоретический материал</h2></div>
        </div>
      </div>

      {selectedSection && theoryContent ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 md:p-6">
            {loadingTheoryByTopicSection ? (
              <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : (
              <TheoryViewer content={theoryContent.content} />
            )}
          </div>
        </div>
      ) : (
        <>
          {theoryTopics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {theoryTopics.map(topic => (
                <TopicCard key={topic.topic} topic={topic} onClick={handleTopicClick} />
              ))}
            </div>
          )}
          {theoryTopics.length === 0 && !theoryLoading && (
            <div className="bg-white rounded-[2.5rem] p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4"><Library size={40} className="text-slate-300" /></div>
              <p className="font-black text-slate-400 uppercase">Теория пока не добавлена</p>
            </div>
          )}
        </>
      )}

      {selectedSection && theoryContent && (
        <TheoryAIChat theoryContent={theoryContent.content} topic={selectedTopic?.label || selectedTopic?.topic} section={selectedSection} theoryId={theoryContent?.id} />
      )}

      {/* Back button */}
      {selectedSection && theoryContent && (
        <button onClick={handleBackToTopics}
          className="fixed bottom-6 left-6 z-50 w-12 h-12 md:w-14 md:h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 group" title="Назад">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Section chooser modal */}
      {showSectionModal && selectedTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black uppercase">Выберите раздел</h3>
                  <p className="text-blue-100 text-[10px] font-bold uppercase mt-1">{selectedTopic.label}</p>
                </div>
                <button onClick={() => setShowSectionModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><XCircle size={20} /></button>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {sectionsForModal.map(section => (
                <button key={section.section} onClick={() => { fetchTheoryByTopicSection(selectedTopic.topic, section.section); setShowSectionModal(false); }}
                  className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all font-bold text-slate-700">
                  {section.section}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
