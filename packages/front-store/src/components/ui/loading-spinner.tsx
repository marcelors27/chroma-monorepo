import logo from "@/assets/logo.png";

type LoadingSpinnerProps = {
  size?: number;
  className?: string;
};

export const LoadingSpinner = ({ size = 72, className = "" }: LoadingSpinnerProps) => {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <style>
        {`
          @keyframes chroma-fade {
            0% { opacity: 0.2; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1); }
            100% { opacity: 0.2; transform: scale(0.98); }
          }
        `}
      </style>
      <img
        src={logo}
        alt="Carregando"
        style={{
          width: "100%",
          height: "100%",
          animation: "chroma-fade 1.2s ease-in-out infinite",
        }}
      />
    </div>
  );
};
