import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export type AgeMode = 'exact'|'range'|'any';

type Props = {
  mode: AgeMode;
  setMode: (m: AgeMode) => void;
  exactYear: number;
  exactMonth: number;
  setExactYear: (n: number) => void;
  setExactMonth: (n: number) => void;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  setStartYear: (n: number) => void;
  setStartMonth: (n: number) => void;
  setEndYear: (n: number) => void;
  setEndMonth: (n: number) => void;
  onPreset?: (minMonths: number, maxMonths: number) => void;
};

const years = Array.from({length: 25}, (_, i) => i);
const months = Array.from({length: 12}, (_, i) => i);

export default function AgeSelector({
  mode, setMode,
  exactYear, exactMonth, setExactYear, setExactMonth,
  startYear, startMonth, endYear, endMonth,
  setStartYear, setStartMonth, setEndYear, setEndMonth,
  onPreset
}: Props){
  return (
    <View style={{ gap: 10 }}>
      {/* Mode pills */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
        {[
          {k:'exact', label:'ต้องการอายุเป๊ะ'},
          {k:'range', label:'เลือกช่วงอายุ'},
        ].map((it:any)=>(
          <TouchableOpacity
            key={it.k}
            onPress={() => setMode(it.k as AgeMode)}
            style={{
              paddingHorizontal:14, paddingVertical:8,
              borderRadius:20, borderWidth:1, borderColor:'#cbd5ff',
              backgroundColor: mode===it.k ? '#4f46e5' : '#fff'
            }}
          >
            <Text style={{ color: mode===it.k ? '#fff' : '#1f2a56', fontWeight:'700' }}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exact */}
      {mode==='exact' && (
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1, borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, overflow:'hidden', backgroundColor:'#fff' }}>
            <Picker selectedValue={exactYear} onValueChange={(v) => setExactYear(Number(v))}>
              {years.map(y => <Picker.Item key={y} label={`${y} ปี`} value={y} />)}
            </Picker>
          </View>
          <View style={{ flex:1, borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, overflow:'hidden', backgroundColor:'#fff' }}>
            <Picker selectedValue={exactMonth} onValueChange={(v) => setExactMonth(Number(v))}>
              {months.map(m => <Picker.Item key={m} label={`${m} เดือน`} value={m} />)}
            </Picker>
          </View>
        </View>
      )}

      {/* Range */}
      {mode==='range' && (
        <View style={{ gap:10 }}>
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1, borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, overflow:'hidden', backgroundColor:'#fff' }}>
              <Picker selectedValue={startYear} onValueChange={(v) => setStartYear(Number(v))}>
                {years.map(y => <Picker.Item key={y} label={`เริ่ม ${y} ปี`} value={y} />)}
              </Picker>
            </View>
            <View style={{ flex:1, borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, overflow:'hidden', backgroundColor:'#fff' }}>
              <Picker selectedValue={startMonth} onValueChange={(v) => setStartMonth(Number(v))}>
                {months.map(m => <Picker.Item key={m} label={`${m} เดือน`} value={m} />)}
              </Picker>
            </View>
          </View>

          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ flex:1, borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, overflow:'hidden', backgroundColor:'#fff' }}>
              <Picker selectedValue={endYear} onValueChange={(v) => setEndYear(Number(v))}>
                {years.map(y => <Picker.Item key={y} label={`สิ้นสุด ${y} ปี`} value={y} />)}
              </Picker>
            </View>
            <View style={{ flex:1, borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, overflow:'hidden', backgroundColor:'#fff' }}>
              <Picker selectedValue={endMonth} onValueChange={(v) => setEndMonth(Number(v))}>
                {months.map(m => <Picker.Item key={m} label={`${m} เดือน`} value={m} />)}
              </Picker>
            </View>
          </View>
        </View>
      )}

      {!!onPreset && mode!=='any' && (
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
          {[
            { label:'ลูกสัตว์ (0–6 เดือน)', min:0, max:6 },
            { label:'วัยรุ่น (6–12 เดือน)', min:6, max:12 },
            { label:'โตเต็มวัย (1–7 ปี)', min:12, max:84 },
            { label:'สูงวัย (7+ ปี)', min:84, max:999 }
          ].map(p => (
            <TouchableOpacity key={p.label} onPress={() => onPreset(p.min, p.max)}
              style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:999, backgroundColor:'#e3eaff' }}>
              <Text style={{ color:'#1f2a56', fontWeight:'700' }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={{ color:'#6b7280' }}>
        เลือกแบบ “เป๊ะ” (เช่น 5 เดือน) หรือ “ช่วงอายุ” (เช่น 2–3 เดือน) ก็ได้
      </Text>
    </View>
  );
}
