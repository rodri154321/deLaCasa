import logo from '../assets/logopng.webp';

interface SplashScreenProps {
  isLeaving?: boolean;
}

export default function SplashScreen({ isLeaving = false }: SplashScreenProps) {
  return (
    <div className={`public-splash ${isLeaving ? 'public-splash-leaving' : ''}`}>
      <div className="public-splash-mark">
        <img src={logo} alt="DeLaCasa" className="public-splash-logo" />
      </div>
      <p className="public-splash-text">Menú</p>
    </div>
  );
}
