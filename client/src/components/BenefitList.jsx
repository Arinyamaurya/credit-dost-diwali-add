import React from 'react';
import { motion } from 'framer-motion';
import {
  FileDown,
  Sparkles as BrainSparkles,
  GraduationCap,
  TrendingUp,
  Home,
  BadgeIndianRupee,
  ShieldCheck,
  Zap,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';

const ICON_MAP = {
  FileDown,
  Sparkles: BrainSparkles,
  GraduationCap,
  TrendingUp,
  Home,
  BadgeIndianRupee,
  ShieldCheck,
  Zap,
  PhoneCall,
};

/**
 * BenefitList: Staggered animated benefits list with gold circular badge icon and description
 */
export const BenefitList = ({ benefits = [] }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -14 },
    show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <div className="benefits-section">
      <h3 className="benefits-title">
        <CheckCircle2 size={18} color="#2c1a66" />
        <span>What's included in this offer</span>
      </h3>

      <motion.ul
        className="benefits-list"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
      >
        {benefits.map((b, idx) => {
          const IconComponent = ICON_MAP[b.icon] || CheckCircle2;
          return (
            <motion.li key={idx} className="benefit-item" variants={itemVariants}>
              <div className="benefit-icon-badge" aria-hidden="true">
                <IconComponent size={19} />
              </div>
              <div className="benefit-content">
                <div className="benefit-name">{b.title}</div>
                <div className="benefit-desc">{b.description}</div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
};
