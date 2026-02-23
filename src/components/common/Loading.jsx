import { GiWheat } from 'react-icons/gi';

const Loading = ({ fullScreen = true, message = 'Đang tải...' }) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center animate-pulse">
          <GiWheat className="text-white text-3xl" />
        </div>
        <div className="absolute -inset-2 bg-primary-500/20 rounded-3xl animate-ping" />
      </div>
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
};

export default Loading;

