import logo from '../assets/wafaa-logo.png';

export default function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`.trim()} src={logo} alt="" aria-hidden="true" />;
}
