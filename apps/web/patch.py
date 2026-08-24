import sys

with open('apps/web/src/components/Home/DMArea.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'import AttachmentViewer from \'../Chat/AttachmentViewer\';',
    'import AttachmentViewer from \'../Chat/AttachmentViewer\';\nimport GroupMemberList from \'./GroupMemberList\';'
)

code = code.replace(
    'const [isLeaving, setIsLeaving] = useState(false);',
    'const [isLeaving, setIsLeaving] = useState(false);\n  const [showMemberList, setShowMemberList] = useState(true);'
)

code = code.replace(
    '              : <Video size={24} />}\n          </button>\n        </div>',
    '              : <Video size={24} />}\n          </button>\n          {isGroup && (\n            <button \n              onClick={() => setShowMemberList(!showMemberList)}\n              className={`transition-colors ${showMemberList ? \'text-[#DBDEE1]\' : \'hover:text-[#DBDEE1]\'}`}\n              title=\"Ocultar Lista de Membros\"\n            >\n              <Users size={24} />\n            </button>\n          )}\n        </div>'
)

code = code.replace(
    '<div className=\"flex-1 flex flex-col bg-[#313338] h-full\">',
    '<div className=\"flex-1 flex flex-row h-full overflow-hidden\">\n    <div className=\"flex-1 flex flex-col bg-[#313338] h-full min-w-0\">'
)

code = code.replace(
    '      </div>\n\n      {selectedUserPopout && (',
    '      </div>\n    </div>\n\n    {/* Sidebar Members */}\n    {isGroup && showMemberList && (\n      <GroupMemberList \n        participants={conversation.participants} \n        ownerId={conversation.ownerId}\n        onUserClick={handleUserClick}\n      />\n    )}\n\n      {selectedUserPopout && ('
)

with open('apps/web/src/components/Home/DMArea.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
