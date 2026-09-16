import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MAIN_TOPICS } from '../AdminDashboardPage/constants';
import TopicArt from './TopicArt';

const ease = [0.16, 1, 0.3, 1];

function sectionsLabel(count) {
  const n = Number(count) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = 'разделов';
  if (mod10 === 1 && mod100 !== 11) word = 'раздел';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'раздела';
  return `${n} ${word}`;
}

export default function TopicCard({ topic, onClick, index = 0 }) {
  const reduce = useReducedMotion();
  const label = MAIN_TOPICS[topic.topic] || topic.label || topic.topic;
  const delay = Math.min(index, 8) * 0.05;

  return (
    <motion.button
      type="button"
      onClick={() => onClick(topic)}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : { scale: 0.995, y: -1, transition: { duration: 0.12 } }}
      variants={{
        hover: { y: -6, transition: { duration: 0.35, ease } },
      }}
      className="group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 pr-3 text-left shadow-sm
                 hover:border-zinc-300 hover:shadow-[0_22px_40px_-22px_rgb(0_0_0/0.45)]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50
                 dark:border-zinc-800/60 dark:bg-[#09090b] dark:hover:border-zinc-700
                 dark:focus-visible:ring-white dark:focus-visible:ring-offset-zinc-950"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800/60">
        <motion.div
          className="h-full w-full origin-center"
          variants={reduce ? undefined : { hover: { scale: 1.06, transition: { duration: 0.55, ease } } }}
        >
          <TopicArt topic={topic} />
        </motion.div>
        {!reduce && (
          <motion.div
            aria-hidden
            initial={{ x: '-120%' }}
            variants={{ hover: { x: '220%', transition: { duration: 0.85, ease } } }}
            className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{label}</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sectionsLabel(topic.sections_count)}</p>
      </div>

      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-zinc-300
                   transition-colors duration-300
                   group-hover:border-zinc-200 group-hover:bg-zinc-50 group-hover:text-zinc-900
                   dark:text-zinc-600 dark:group-hover:border-zinc-700 dark:group-hover:bg-zinc-900 dark:group-hover:text-zinc-100"
      >
        <motion.span
          className="flex"
          variants={reduce ? undefined : { hover: { x: 3, transition: { duration: 0.28, ease } } }}
        >
          <ArrowRight size={16} />
        </motion.span>
      </span>
    </motion.button>
  );
}
