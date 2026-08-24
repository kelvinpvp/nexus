const fs = require('fs');
let code = fs.readFileSync('src/components/Home/DMArea.tsx', 'utf8');

// 1. Add GroupMemberList import
code = code.replace(
  'import AttachmentViewer from \'../Chat/AttachmentViewer\';',
  'import AttachmentViewer from \'../Chat/AttachmentViewer\';\nimport GroupMemberList from \'./GroupMemberList\';'
);

// 2. Add showMemberList state
code = code.replace(
  'const [isLeaving, setIsLeaving] = useState(false);',
  'const [isLeaving, setIsLeaving] = useState(false);\n  const [showMemberList, setShowMemberList] = useState(true);'
);

// 3. Add toggle button
code = code.replace(
  '<button className="hover:text-[#DBDEE1] transition-colors" title="Fixar Mensagens">',
  '          {isGroup && (\n            <button \n              onClick={() => setShowMemberList(!showMemberList)}\n              className={`transition-colors ${showMemberList ? \'text-[#DBDEE1]\' : \'hover:text-[#DBDEE1]\'}`}\n              title="Ocultar Lista de Membros"\n            >\n              <Users size={24} />\n            </button>\n          )}\n          <button className="hover:text-[#DBDEE1] transition-colors" title="Fixar Mensagens">'
);

// 4. Add GroupMemberList rendering and wrap chat in flex-1
code = code.replace(
  '        </div>\n      </div>\n\n      {selectedUserPopout && (',
  '        </div>\n      </div>\n\n      {/* Sidebar Members */}\n      {isGroup && showMemberList && (\n        <GroupMemberList \n          participants={conversation.participants} \n          ownerId={conversation.ownerId}\n          onUserClick={handleUserClick}\n        />\n      )}\n\n      {selectedUserPopout && ('
);

code = code.replace(
  '<div className="flex-1 flex flex-col bg-[#313338] h-full">',
  '<div className="flex-1 flex flex-row h-full overflow-hidden">\n    <div className="flex-1 flex flex-col bg-[#313338] h-full min-w-0">'
);

code = code.replace(
  '{/* Sidebar Members */}',
  '</div>\n      {/* Sidebar Members */}'
);

fs.writeFileSync('src/components/Home/DMArea.tsx', code);
