export default function StudyGuide({ stageId }) {
    return <details className="palace-study-guide">
        <summary>开战前看一眼 · 核心招式表</summary>
        {stageId === 'prepositions' ? <>
            <p>先看介词要求的格，再看名词的性和数。</p>
            <table><thead><tr><th>名词</th><th>第一格</th><th>第四格</th><th>第三格</th></tr></thead><tbody>
                <tr><th>阳性</th><td>der</td><td>den</td><td>dem</td></tr>
                <tr><th>阴性</th><td>die</td><td>die</td><td>der</td></tr>
                <tr><th>中性</th><td>das</td><td>das</td><td>dem</td></tr>
                <tr><th>复数</th><td>die</td><td>die</td><td>den + 名词常加 -n</td></tr>
            </tbody></table>
            <p><b>第三格：</b>mit、bei、nach、aus、von、zu。<br /><b>第四格：</b>für、ohne、durch、gegen、um。</p>
            <p>双向介词 in、auf、an 等描述“在哪里”用第三格，描述“到哪里”用第四格。在一个地方走动，也仍可能用第三格。</p>
        </> : stageId === 'adjectives' ? <>
            <p>按“冠词 → 性和数 → 格”的顺序判断词尾。</p>
            <table><thead><tr><th>场景</th><th>定冠词</th><th>不定冠词</th><th>无冠词</th></tr></thead><tbody>
                <tr><th>阳性主格</th><td>der gute Tee</td><td>ein guter Tee</td><td>guter Tee</td></tr>
                <tr><th>阴性宾格</th><td>die gute Suppe</td><td>eine gute Suppe</td><td>gute Suppe</td></tr>
                <tr><th>中性与格</th><td>dem guten Brot</td><td>einem guten Brot</td><td>gutem Brot</td></tr>
                <tr><th>复数主格</th><td>die guten Bücher</td><td>keine guten Bücher</td><td>gute Bücher</td></tr>
            </tbody></table>
            <p>定冠词后，主格单数和阴／中性宾格常用 -e，其余用 -en。不定冠词没显示出的性和格，需要形容词补足。</p>
        </> : stageId === 'verbs' ? <>
            <p>先找主语和时间，再选动词形式。主句的变位动词通常放第二位。</p>
            <table><thead><tr><th>用法</th><th>例句</th></tr></thead><tbody>
                <tr><th>现在时</th><td lang="de">ich fahre · du fährst · er fährt</td></tr>
                <tr><th>情态动词</th><td lang="de">Ich muss heute arbeiten.</td></tr>
                <tr><th>完成时</th><td lang="de">Ich habe gelernt. · Ich bin gefahren.</td></tr>
                <tr><th>常见过去时</th><td lang="de">ich war · ich hatte · ich konnte</td></tr>
                <tr><th>将来时</th><td lang="de">Ich werde morgen kommen.</td></tr>
            </tbody></table>
            <p>可分动词主句分开：<span lang="de">Ich rufe dich an.</span> 完成时过去分词连写：<span lang="de">Ich habe dich angerufen.</span></p>
        </> : stageId === 'wordorder' ? <>
            <p>先认连接词，再判断是主句还是从句。</p>
            <table><thead><tr><th>结构</th><th>例句</th></tr></thead><tbody>
                <tr><th>主句动词第二位</th><td lang="de">Heute lerne ich Deutsch.</td></tr>
                <tr><th>weil / dass / wenn</th><td lang="de">…, weil ich Deutsch lerne.</td></tr>
                <tr><th>denn / aber / und</th><td lang="de">…, denn ich lerne Deutsch.</td></tr>
                <tr><th>deshalb / trotzdem</th><td lang="de">Deshalb lerne ich Deutsch.</td></tr>
                <tr><th>zu 不定式</th><td lang="de">Ich versuche, pünktlich anzukommen.</td></tr>
            </tbody></table>
            <p>从句中，可分动词也放句末并连写：<span lang="de">…, weil der Zug ankommt.</span> 问句则注意动词在第一位或疑问词之后。</p>
        </> : stageId === 'pronouns' ? <>
            <p>主语用主格，直接宾语常用第四格，接受者及 helfen、danken 等动词的对象用第三格。</p>
            <table><thead><tr><th>主格</th><th>第四格</th><th>第三格</th></tr></thead><tbody>
                <tr><td>ich</td><td>mich</td><td>mir</td></tr>
                <tr><td>du</td><td>dich</td><td>dir</td></tr>
                <tr><td>er / sie / es</td><td>ihn / sie / es</td><td>ihm / ihr / ihm</td></tr>
                <tr><td>wir / ihr / sie</td><td>uns / euch / sie</td><td>uns / euch / ihnen</td></tr>
            </tbody></table>
            <p><span lang="de">Ich wasche mich.</span> 我洗自己。<br /><span lang="de">Ich wasche mir die Hände.</span> 我洗手：die Hände 已是第四格宾语，反身代词用 mir。</p>
        </> : <>
            <p>名词连冠词一起记：<span lang="de">die Prüfung</span>（考试）。动词连搭配一起记：<span lang="de">sich vorbereiten auf + Akk.</span>（为……准备）。</p>
            <p>中→德练回忆，德→中练识别。先自己想，再看选项；答完跟着短句读一遍。错词会重新出现，连续答对两次记为“已熟练”。</p>
        </>}
    </details>;
}
