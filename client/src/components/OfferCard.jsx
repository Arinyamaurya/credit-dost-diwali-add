import React from 'react';
import { motion } from 'framer-motion';
import { PriceBlock } from './PriceBlock';
import { BenefitList } from './BenefitList';
import { LeadForm } from './LeadForm';
import { SpotsMeter } from './SpotsMeter';
import { SparkleIcon, DiyaFlameIcon } from './icons/FestiveIcons';

/**
 * OfferCard:
 * Unified card component driven by plan configuration in config.js.
 * Renders glassmorphic shell, gold light sweep, optional popular ribbon,
 * SpotsMeter (live honest counter), PriceBlock, and inner ivory content (BenefitList + LeadForm).
 */
export const OfferCard = ({
  plan,
  spotData = null,
  onLeadSuccess,
}) => {
  const isPartner = plan.kind === 'partner';
  const starburstText = isPartner ? 'SAVE ₹500' : '70% OFF';
  const isSoldOut = Boolean(spotData?.soldOut || (spotData?.remaining !== undefined && spotData.remaining <= 0));

  return (
    <motion.article
      id={plan.id}
      className="offer-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="card-top-sweep" aria-hidden="true" />

      {plan.ribbon && (
        <div className="card-popular-ribbon">
          <SparkleIcon size={14} />
          <span>{plan.ribbon}</span>
          <SparkleIcon size={14} />
        </div>
      )}

      <div className="card-body">
        <div className="card-header-badge">
          <DiyaFlameIcon size={15} />
          <span>{plan.badge}</span>
        </div>

        <h2 className="card-title">{plan.title}</h2>
        <p className="card-subtitle">{plan.subtitle}</p>

        {/* Real Claimed Spots Progress Bar with animated count-up and urgency tag */}
        <SpotsMeter spotData={spotData} />

        <PriceBlock
          priceFormatted={plan.priceFormatted}
          oldPriceFormatted={plan.oldPriceFormatted}
          oldPriceLabel={plan.oldPriceLabel}
          chips={plan.chips}
          priceNote={plan.priceNote}
          starburstText={starburstText}
        />

        {/* Inner Ivory Container for Readability */}
        <div className="card-inner-ivory">
          <BenefitList benefits={plan.benefits} />
          <LeadForm
            plan={plan}
            isSoldOut={isSoldOut}
            onLeadSuccess={onLeadSuccess}
          />
        </div>
      </div>
    </motion.article>
  );
};
