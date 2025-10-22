import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AgeSelector from '../../../components/AgeSelector';
import { yMtoMonths, monthsToString } from '../../utils/age';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API from '../../../android/app/src/config';

type Option = { id:number; label:string };

// -------- Master API helpers --------
const MASTER_READ = (API as any).MASTER_READ || `${(API as any).BASE_URL || ''}/post/master_read_api.php`;
const POST_FIND_PET = (API as any).POST_FIND_PET || `${(API as any).BASE_URL || ''}/post/findPet.php`;
const MATCH_POSTS = (API as any).MATCH_POSTS || `${(API as any).BASE_URL || ''}/post/match_posts.php`;
const MATCH_RESULT_ROUTE = (API as any).ROUTE_MATCH_RESULT || 'MatchResult';

const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([,v]) => v !== undefined && v !== null && v !== '')
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const speciesCode = (type: string) => (type === 'หมา' ? 'dog' : 'cat');
const fetchMaster = async (entity: string, params: any = {}) => {
  const qs = buildQuery(params);
  const url = `${MASTER_READ}?entity=${entity}${qs ? `&${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.message || 'fetch master failed');
  return json.data as any[];
};
const toOptions = (rows: any[], idKey: string, nameKey = 'name_th'): Option[] =>
  rows.map((r) => ({ id: r[idKey], label: r[nameKey] || '' }));

// --- UI helpers ---
const ThemedDivider = () => (
  <View style={{height:1, backgroundColor:'#c7d7ff', marginVertical:12, marginHorizontal:10, borderRadius:1}} />
);
const Section = ({children}:{children:React.ReactNode}) => (
  <View style={{ backgroundColor:'#f1f5ff', padding:12, borderRadius:14, marginBottom:12 }}>
    {children}
  </View>
);
const Label = ({children}:{children:React.ReactNode}) => (
  <Text style={{ fontSize:16, fontWeight:'700', color:'#1f2a56', marginBottom:6 }}>{children}</Text>
);
const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor="#9aa3c7" />
);
const ThemedPicker = ({selectedValue,onValueChange,options,placeholder}:{selectedValue:any;onValueChange:(v:any)=>void;options:Option[];placeholder:string}) => (
  <View style={styles.pickerWrap}>
    <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
      <Picker.Item label={placeholder} value="" />
      {options.map(opt => <Picker.Item key={opt.id} label={opt.label} value={opt.label} />)}
    </Picker>
  </View>
);

const LabelWithTooltip = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <View>
      {tooltipVisible && (
        <View style={styles.tooltipContainer}>
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>{tooltip}</Text>
          </View>
          <View style={styles.tooltipArrow} />
        </View>
      )}
      <TouchableOpacity
        onLongPress={() => setTooltipVisible(true)}
        onPressOut={() => setTooltipVisible(false)}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}
      >
        <Label>{children}</Label>
        <Text style={{ color: 'red', fontSize: 18, marginLeft: 4, fontWeight: 'bold' }}>*</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Dropdown with multi-select & max ---
const MultiSelectDropdown = ({
  options, selected, onChange, placeholder, max = 3
}: { options: Option[]; selected: string[]; onChange: (next: string[]) => void; placeholder: string; max?: number }) => {
  const [open, setOpen] = useState(false);
  const toggle = (label: string) => {
    const exists = selected.includes(label);
    let next = [...selected];
    if (exists) next = next.filter(l => l !== label);
    else {
      if (selected.length >= max) { Alert.alert(`เลือกได้สูงสุด ${max} รายการ`); return; }
      next.push(label);
    }
    onChange(next);
  };
  return (
    <View style={{borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, backgroundColor:'#fff'}}>
      <TouchableOpacity onPress={()=>setOpen(!open)} style={{padding:12}}>
        <Text style={{color:selected.length? '#1f2a56':'#9aa3c7'}}>
          {selected.length ? selected.join(', ') : placeholder}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={{borderTopWidth:1, borderTopColor:'#e5e7ff', paddingVertical:6}}>
          {options.map(opt => (
            <TouchableOpacity key={opt.id} style={styles.checkRow} onPress={()=>toggle(opt.label)}>
              <View style={[styles.checkbox, selected.includes(opt.label) && styles.checkboxActive]} />
              <Text style={{marginLeft:8}}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const COLORS_DOG = ['ขาว','ดำ','น้ำตาล','ทอง','เทา','ดำ-น้ำตาล','ขาว-ดำ','ครีม','ผสม'];
const COLORS_CAT = ['ขาว','ดำ','ส้ม','เทา','ลายเสือ','ขาว-ดำ','ดำ-ส้ม','ครีม','ผสม'];

const FP_Post = () => {
  const navigation: any = useNavigation();
  const [loading, setLoading] = useState(false);
  
  const tooltipMessage = "ข้อมูลสำคัญที่ใช้ในการจับคู่";

  const [formData, setFormData] = useState({
    title:'',
    type:'หมา',
    breed:'',
    gender:'',
    age_mode:'exact',
    exactYear:0,
    exactMonth:0,
    startYear:0,
    startMonth:0,
    endYear:0,
    endMonth:0,
    color:[] as string[],
    steriliz:'',
    vaccinated:'',
    environmentSel: [] as string[]
  });
  const [otherColorText, setOtherColorText] = useState('');
  const [vaccineList,setVaccineList] = useState<string[]>([]);

  const [breedOptions,setBreedOptions] = useState<Option[]>([]);
  const [vaccineOptions,setVaccineOptions] = useState<Option[]>([]);
  const [housingOptions,setHousingOptions] = useState<Option[]>([]);

  useEffect(()=>{
    const sp = speciesCode(formData.type);
    (async()=>{
      try{
        const [breeds, vaccines, housings] = await Promise.all([
          fetchMaster('breeds',{species:sp,active:1,per_page:300}),
          fetchMaster('vaccines',{species:sp,active:1,per_page:300}),
          fetchMaster('housing_types',{active:1,per_page:300}),
        ]);
        setBreedOptions(toOptions(breeds,'breed_id'));
        setVaccineOptions(toOptions(vaccines,'vaccine_id'));
        setHousingOptions(toOptions(housings,'housing_id'));
      }catch(e){ console.warn(e); }
    })();
  },[formData.type]);

  const toggleColor = (c:string)=>{
    setFormData(prev=>{
      const arr = [...prev.color];
      const idx = arr.indexOf(c);
      if (idx>=0) {
        arr.splice(idx,1);
      } else {
        arr.push(c);
      }
      return {...prev, color:arr};
    });
  };

  const submit = async ()=>{
    if (!formData.title) return Alert.alert('กรุณากรอกชื่อโพสต์');
    setLoading(true);
    try{
      const username = await AsyncStorage.getItem('username') || 'guest';
      let minMonths: number | null = null, maxMonths: number | null = null;
      if (formData.age_mode === 'exact') {
        const m = yMtoMonths(formData.exactYear, formData.exactMonth);
        minMonths = m; maxMonths = m;
      } else if (formData.age_mode === 'range') {
        minMonths = yMtoMonths(formData.startYear, formData.startMonth);
        maxMonths = yMtoMonths(formData.endYear, formData.endMonth);
        if ((minMonths as number) > (maxMonths as number)) {
          Alert.alert('ตรวจสอบช่วงอายุ', 'อายุเริ่มต้นมากกว่าสิ้นสุด');
          setLoading(false);
          return;
        }
      }
      const min_age = (minMonths===null) ? '' : monthsToString(minMonths);
      const max_age = (maxMonths===null) ? '' : monthsToString(maxMonths);

      let finalColors = formData.color.filter(c => c !== 'อื่นๆ');
      if (formData.color.includes('อื่นๆ') && otherColorText.trim()) {
          // [แก้ไข] เปลี่ยนตัวคั่นเป็น "," และ trim() แต่ละสี
          const otherColors = otherColorText.trim().split(',').map(c => c.trim()).filter(Boolean);
          finalColors = [...finalColors, ...otherColors];
      }

      const payload = {
        title:formData.title, type:formData.type, breed:formData.breed, sex:formData.gender,
        min_age: min_age,
        max_age: max_age,
        color: finalColors.join(', '),
        steriliz:formData.steriliz,
        vaccine: formData.vaccinated==='ฉีดวัคซีนแล้ว' ? vaccineList.join(', ') : (formData.vaccinated || 'ไม่ระบุ'),
        environment: (formData.environmentSel as string[]).join(', '),
        user: username, postType:'fp'
      };

      const res = await fetch(POST_FIND_PET, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const json = await res.json();

      if (json?.status === 'success') {
        const insertId = Number(json.insert_id ?? json.id);
        if (insertId > 0) {
          const url = `${MATCH_POSTS}?mode=from_fp&id=${insertId}&limit=3&save=1`;
          const mRes = await fetch(url);
          const mJson = await mRes.json();

          if (mJson?.status === 'success') {
            try {
              navigation.navigate(MATCH_RESULT_ROUTE, {
                mode: 'from_fp',
                sourceId: insertId,
                items: mJson.data,
                raw: mJson
              });
            } catch {
              Alert.alert('โพสต์สำเร็จ', `จับคู่ได้ ${mJson.data?.length || 0} รายการ`);
            }
          } else {
            Alert.alert('สำเร็จบางส่วน', `โพสต์สำเร็จ แต่จับคู่ไม่สำเร็จ: ${mJson?.message || 'ไม่ทราบสาเหตุ'}`);
          }
        } else {
          Alert.alert('สำเร็จบางส่วน', 'โพสต์สำเร็จ แต่ API ไม่ได้ส่ง insert_id กลับมา จึงยังไม่จับคู่อัตโนมัติ');
        }
      } else {
        Alert.alert('ผิดพลาด', json?.message || 'บันทึกไม่ได้');
      }
    } catch (e:any) {
      Alert.alert('ผิดพลาด', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <Section>
          <Label>ชื่อโพสต์</Label>
          <Input placeholder="กรอกชื่อโพสต์" value={formData.title} onChangeText={(t:string)=>setFormData(p=>({...p,title:t}))} />
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>ชนิดของสัตว์เลี้ยง</LabelWithTooltip>
          <View style={styles.row}>
            {['หมา','แมว'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.type===opt && styles.pillActive]} onPress={() => {
                setFormData(p=>({...p,type:opt, color: []}));
                setOtherColorText('');
              }}>
                <Text style={[styles.pillText, formData.type===opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>สายพันธุ์ที่สนใจ</LabelWithTooltip>
          <ThemedPicker selectedValue={formData.breed} onValueChange={(v:any)=>setFormData(p=>({...p,breed:String(v)}))} options={breedOptions} placeholder="-- เลือกสายพันธุ์ --" />
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>เพศที่ต้องการ</LabelWithTooltip>
          <View style={styles.row}>
            {['ผู้','เมีย', 'ไม่ระบุ'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.gender===opt && styles.pillActive]} onPress={()=>setFormData(p=>({...p,gender:opt}))}>
                <Text style={[styles.pillText, formData.gender===opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>อายุที่ต้องการ</LabelWithTooltip>
          <AgeSelector
            mode={formData.age_mode as any}
            setMode={(m)=>setFormData(p=>({...p, age_mode:m}))}
            exactYear={formData.exactYear} exactMonth={formData.exactMonth}
            setExactYear={(n)=>setFormData(p=>({...p, exactYear:n}))}
            setExactMonth={(n)=>setFormData(p=>({...p, exactMonth:n}))}
            startYear={formData.startYear} startMonth={formData.startMonth}
            endYear={formData.endYear} endMonth={formData.endMonth}
            setStartYear={(n)=>setFormData(p=>({...p, startYear:n}))}
            setStartMonth={(n)=>setFormData(p=>({...p, startMonth:n}))}
            setEndYear={(n)=>setFormData(p=>({...p, endYear:n}))}
            setEndMonth={(n)=>setFormData(p=>({...p, endMonth:n}))}
            onPreset={(min,max)=>{
              setFormData(p=>({
                ...p,
                age_mode:'range',
                startYear: Math.floor(min/12), startMonth: min%12,
                endYear: Math.floor(max/12), endMonth: max%12
              }))
            }}
          />
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>สีที่สนใจ</LabelWithTooltip>
          <View style={styles.row}>
            {[...(formData.type === 'หมา' ? COLORS_DOG : COLORS_CAT), 'อื่นๆ'].map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.pill, formData.color.includes(c) && styles.pillActive]} 
                onPress={()=>toggleColor(c)}
              >
                <Text style={[styles.pillText, formData.color.includes(c) && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.color.includes('อื่นๆ') && (
            <Input 
                style={{marginTop: 10}}
                // [แก้ไข] เปลี่ยน Placeholder
                placeholder="ระบุสีอื่นๆ (คั่นด้วย , เช่น เทา, น้ำตาลเข้ม)"
                value={otherColorText}
                onChangeText={setOtherColorText}
            />
          )}
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>สถานะทำหมัน</LabelWithTooltip>
          <View style={styles.row}>
            {['ทำหมันแล้ว','ยังไม่ได้ทำหมัน','ไม่ระบุ'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.steriliz===opt && styles.pillActive]} onPress={()=>setFormData(p=>({...p,steriliz:opt}))}>
                <Text style={[styles.pillText, formData.steriliz===opt && styles.pillActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>สถานะวัคซีน</LabelWithTooltip>
          <View style={styles.row}>
            {['ฉีดวัคซีนแล้ว','ยังไม่ได้ฉีด','ไม่ระบุ'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.vaccinated===opt && styles.pillActive]} onPress={()=>setFormData(p=>({...p,vaccinated:opt}))}>
                <Text style={[styles.pillText, formData.vaccinated===opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.vaccinated==='ฉีดวัคซีนแล้ว' && (
            <View style={{marginTop:8}}>
              {vaccineOptions.map(opt => (
                <TouchableOpacity key={opt.id} style={styles.checkRow} onPress={()=>{
                  setVaccineList(prev => prev.includes(opt.label) ? prev.filter(v=>v!==opt.label) : [...prev, opt.label]);
                }}>
                  <View style={[styles.checkbox, vaccineList.includes(opt.label) && styles.checkboxActive]} />
                  <Text style={{marginLeft:8}}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <ThemedDivider />

          <Label>ประเภทที่อยู่อาศัย (เลือกได้สูงสุด 3)</Label>
          <MultiSelectDropdown options={housingOptions} selected={formData.environmentSel} onChange={(arr)=>setFormData(p=>({...p,environmentSel:arr}))} placeholder="-- เลือกประเภทที่อยู่อาศัย --" max={3} />
        </Section>

        <TouchableOpacity style={[styles.btnPrimary, loading && {opacity:.6}]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>โพสต์</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FP_Post;

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#ffffff' },
  scrollContent:{ padding:16, paddingBottom:40 },
  title:{ fontSize:20, fontWeight:'800', color:'#1f2a56', marginBottom:10 },
  input:{ borderWidth:1, borderColor:'#cbd5ff', backgroundColor:'#fff', borderRadius:12, paddingHorizontal:12, paddingVertical:10, color:'#1f2a56' },
  row:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  pill:{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:'#cbd5ff', backgroundColor:'#ffffff' },
  pillActive:{ backgroundColor:'#4f46e5', borderColor:'#4f46e5' },
  pillText:{ color:'#1f2a56', fontWeight:'600' },
  pillTextActive:{ color:'#fff' },
  pickerWrap:{ borderWidth:1, borderColor:'#cbd5ff', borderRadius:12, overflow:'hidden', backgroundColor:'#fff' },
  checkRow:{ flexDirection:'row', alignItems:'center', paddingVertical:8, paddingHorizontal:12 },
  checkbox:{ width:18, height:18, borderRadius:4, borderWidth:1.5, borderColor:'#6b7cff', backgroundColor:'#fff' },
  checkboxActive:{ backgroundColor:'#6b7cff' },
  btnSecondary:{ marginTop:12, alignSelf:'flex-start', backgroundColor:'#e3eaff', paddingVertical:10, paddingHorizontal:14, borderRadius:12 },
  btnSecondaryText:{ color:'#1f2a56', fontWeight:'700' },
  btnPrimary:{ marginTop:10, backgroundColor:'#4f46e5', paddingVertical:14, borderRadius:14, alignItems:'center' },
  btnPrimaryText:{ color:'#fff', fontWeight:'800', fontSize:16 },
  
  tooltipContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
    marginBottom: 8,
  },
  tooltipBox: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 14,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#333333',
  },
});