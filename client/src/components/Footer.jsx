import React from 'react';
import { SparkleIcon } from './icons/FestiveIcons';
import { CONTACT_EMAIL, CONTACT_PHONE } from '../config';
import { Mail, Phone } from 'lucide-react';

/**
 * Footer:
 * Fraunces gold line "Shubh Deepawali from Credit Dost",
 * offer disclaimer, terms/privacy placeholder routes, and contact info.
 */
export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-container">
        <h2 className="footer-greeting">
          <SparkleIcon size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
          Shubh Deepawali from Credit Dost
          <SparkleIcon size={22} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '8px' }} />
        </h2>

        <p className="footer-disclaimer">
          Offers are valid for the first 100 partners and the first 100 customers
          respectively and may be withdrawn without prior notice. GST extra as applicable.
          Credit score repair timelines and improvements vary per individual credit bureau profile and history.
        </p>

        <div className="footer-contact-row">
          <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`} className="footer-contact-item">
            <Phone size={16} />
            <span>{CONTACT_PHONE}</span>
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="footer-contact-item">
            <Mail size={16} />
            <span>{CONTACT_EMAIL}</span>
          </a>
        </div>

        

        <div className="footer-copyright">
          © {currentYear} Credit Dost. All rights reserved. Wishing you wealth, prosperity, and financial freedom.
        </div>
      </div>
    </footer>
  );
};
