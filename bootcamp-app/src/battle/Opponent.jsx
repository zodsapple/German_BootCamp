export default function Opponent({ type, className = '' }) {
    const emperor = type === 'emperor';
    const empress = type === 'empress';
    const robe = emperor ? '#ce8538' : empress ? '#77607e' : '#4e7770';
    return (
        <svg className={`palace-opponent ${className}`} viewBox="0 0 300 320" fill="none" aria-hidden="true">
            <ellipse cx="150" cy="302" rx="112" ry="12" fill="#080e12" opacity=".4" />
            <path d="M66 218Q78 177 113 177H187Q222 177 234 218L255 291H45L66 218Z" fill={robe} stroke="#191c22" strokeWidth="5" />
            <path d="M102 186L150 237L198 186M150 237V290" stroke="#e9c783" strokeWidth="8" />
            <path d="M73 226L101 245M227 226L199 245" stroke="#eac888" strokeWidth="5" />
            <circle cx="150" cy="266" r="17" fill="#18292a" stroke="#e9c783" strokeWidth="4" />
            <path d="M142 264L150 255L158 264L150 277Z" fill="#e9c783" />
            {!emperor && <path d="M87 119Q70 177 102 200L111 130M213 119Q230 177 198 200L189 130" fill="#191c22" stroke="#191c22" strokeWidth="8" />}
            <path d="M98 86Q100 53 150 53Q200 53 202 86L199 147Q196 184 150 193Q104 184 101 147L98 86Z" fill="#edc8a0" stroke="#191c22" strokeWidth="5" />
            <ellipse cx="102" cy="130" rx="10" ry="15" fill="#edc8a0" stroke="#191c22" strokeWidth="4" />
            <ellipse cx="198" cy="130" rx="10" ry="15" fill="#edc8a0" stroke="#191c22" strokeWidth="4" />
            <path d="M114 115L135 119M165 119L186 113" stroke="#252024" strokeWidth="6" strokeLinecap="round" />
            <path d="M118 130H132M168 130H182" stroke="#252024" strokeWidth="5" strokeLinecap="round" />
            <path d="M150 130L145 149H154" stroke="#bd8e72" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="119" cy="148" rx="13" ry="6" fill="#d58e76" opacity=".45" />
            <ellipse cx="181" cy="148" rx="13" ry="6" fill="#d58e76" opacity=".45" />
            {emperor ? <>
                <path d="M123 161Q137 150 150 159Q163 150 177 161L164 168L150 164L136 168Z" fill="#252024" />
                <path d="M141 177L150 184L159 177L155 200H145Z" fill="#252024" />
                <path d="M89 93L101 63L115 41H185L199 63L211 93Z" fill="#bd4e3c" stroke="#191c22" strokeWidth="5" />
                <path d="M87 87Q150 74 213 87V104H87Z" fill="#1f2627" stroke="#191c22" strokeWidth="4" />
                <path d="M111 61Q150 47 189 61" stroke="#e9c783" strokeWidth="5" />
                <circle cx="150" cy="35" r="10" fill="#e9c783" stroke="#191c22" strokeWidth="4" />
                <path d="M149 103V120" stroke="#e9c783" strokeWidth="3" />
            </> : empress ? <>
                <path d="M88 101L78 73L110 65L116 38L150 53L184 38L190 65L222 73L212 101Z" fill="#232331" stroke="#191c22" strokeWidth="5" />
                <path d="M98 83L123 73L150 84L177 73L202 83" stroke="#e9c783" strokeWidth="7" />
                <circle cx="150" cy="71" r="9" fill="#ba574e" stroke="#e9c783" strokeWidth="4" />
                <circle cx="117" cy="59" r="6" fill="#e9c783" /><circle cx="183" cy="59" r="6" fill="#e9c783" />
                <path d="M86 95V153M214 95V153" stroke="#e9c783" strokeWidth="3" />
                <circle cx="86" cy="158" r="6" fill="#ba574e" /><circle cx="214" cy="158" r="6" fill="#ba574e" />
                <path d="M139 166Q150 170 161 164" stroke="#a64d53" strokeWidth="5" strokeLinecap="round" />
            </> : <>
                <path d="M90 105Q82 41 150 44Q218 41 210 105L190 86L150 94L110 86Z" fill="#323a3d" stroke="#191c22" strokeWidth="5" />
                <path d="M112 65Q150 51 186 70M114 75Q151 61 190 80" stroke="#a6aaa1" strokeWidth="5" strokeLinecap="round" />
                <circle cx="150" cy="89" r="8" fill="#b8544c" stroke="#d4b575" strokeWidth="3" />
                <path d="M137 168Q150 160 164 168M111 141L107 149M189 141L193 149" stroke="#986d5d" strokeWidth="3" strokeLinecap="round" />
                <path d="M222 222L254 176M238 205L265 168" stroke="#e3d5b6" strokeWidth="4" strokeLinecap="round" />
            </>}
            <path d="M63 249Q92 228 117 251L112 268Q81 278 63 264Z" fill="#edc8a0" stroke="#191c22" strokeWidth="4" />
            <path d="M237 249Q208 228 183 251L188 268Q219 278 237 264Z" fill="#edc8a0" stroke="#191c22" strokeWidth="4" />
        </svg>
    );
}
