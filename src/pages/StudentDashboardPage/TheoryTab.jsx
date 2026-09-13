import React from 'react';
import { Library, X, ArrowLeft } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import TheoryAIChat from '../../components/TheoryAIChat';
import TopicCard from './TopicCard';

export default function TheoryTab({
  theoryTopics, theoryLoading,
  selectedTopic, selectedSection, theoryContent,
  showSectionModal, sectionsForModal,
  loadingTheoryByTopicSection,
  handleTopicClick, handleBackToTopics,
  setShowSectionModal, fetchTheoryByTopicSection,
}) {
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
            <Library size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Теоретический материал</h2>
            {selectedTopic && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {selectedTopic.label || selectedTopic.topic}
                {selectedSection ? ` · ${selectedSection}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {selectedSection && theoryContent ? (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6">
            {loadingTheoryByTopicSection ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
              </div>
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
            <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-16 px-6 flex flex-col items-center text-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                <Library size={24} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Теория пока не добавлена</p>
            </div>
          )}
        </>
      )}

      {selectedSection && theoryContent && (
        <TheoryAIChat theoryContent={theoryContent.content} topic={selectedTopic?.label || selectedTopic?.topic} section={selectedSection} theoryId={theoryContent?.id} />
      )}

      {selectedSection && theoryContent && (
        <button
          type="button"
          onClick={handleBackToTopics}
          className="fixed bottom-6 left-6 z-50 w-12 h-12 md:w-14 md:h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-full shadow-lg flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#09090b]"
          title="Назад"
        >
          <ArrowLeft size={18} />
        </button>
      )}

      {showSectionModal && selectedTopic && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Выберите раздел</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{selectedTopic.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 space-y-1 max-h-96 overflow-y-auto">
              {sectionsForModal.map(section => (
                <button
                  key={section.section}
                  type="button"
                  onClick={() => { fetchTheoryByTopicSection(selectedTopic.topic, section.section); setShowSectionModal(false); }}
                  className="w-full text-left p-4 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
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
