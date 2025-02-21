// components/RepoSelector.tsx
"use client";
import { useState } from "react";
import { Repository } from "@/types/github";



interface RepoSelectorProps {
  repositories: Repository[];
  onSelectRepo: (repo: Repository) => void;
}

export default function RepoSelector({ repositories, onSelectRepo }: RepoSelectorProps): React.ReactElement {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  
  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepoId(repo.id);
    onSelectRepo(repo);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-gray-500 font-semibold mb-4">Select a Repository</h2>
      
      {repositories.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No repositories available.</p>
      ) : (
        <div className="space-y-4">
          {repositories.map(repo => (
            <div 
              key={repo.id} 
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                selectedRepoId === repo.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectRepo(repo)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {repo.name}
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    {repo.full_name} 
                    </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {repo.description || "No description"}
                  </p>

                </div>
                
                <div className="flex items-center space-x-2">
                <span
                className={`text-xs px-2 py-1 rounded-full ${
                    repo.language === "Python"
                    ? "bg-yellow-100 text-yellow-700"
                    : repo.language === "Jupyter Notebook"
                    ? "bg-purple-100 text-purple-700"
                    : repo.language === "JavaScript"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
                >
                {repo.language || "Unknown"}
                </span>
                  <button
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedRepoId === repo.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRepo(repo);
                    }}
                  >
                    {selectedRepoId === repo.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}