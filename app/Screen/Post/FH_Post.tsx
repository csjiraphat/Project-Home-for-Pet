import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, SafeAreaView, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../../android/app/src/config';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';

// Simple MultiSelectDropdown component
const MultiSelectDropdown = ({
  options,
  selected,
  onChange,
  placeholder,
  max = 3
}: {
  options: Option[];
  selected: string[];
  onChange: (sel: string[]) => void;
  placeholder: string;
  max?: number;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[styles.input, { flexDirection: 'row', alignItems: 'center', minHeight: 44 }]}
        onPress={() => setOpen(!open)}
      >
        <Text style={{ color: selected.length ? '#1f2a56' : '#9aa3c7' }}>
          {selected.length ? selected.join(', ') : placeholder}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5ff', marginTop: 4 }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={styles.checkRow}
              onPress={() => {
                if (selected.includes(opt.label)) {
                  onChange(selected.filter(v => v !== opt.label));
                } else if (selected.length < max) {
                  onChange([...selected, opt.label]);
                }
              }}
            >
              <View style={[styles.checkbox, selected.includes(opt.label) && styles.checkboxActive]} />
              <Text style={{ marginLeft: 8 }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

type Option = { id:number; label:string };
type MediaAsset = { uri:string; type:'image'|'video' };

// ---------- helpers ----------
const safeJson = async (res: Response) => {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`เซิร์ฟเวอร์ตอบไม่ใช่ JSON: ${text.slice(0,200)}`); }
};
const extractId = (json: any) => {
  const cand = json?.insert_id ?? json?.id ?? json?.last_id ?? json?.lastInsertId ?? json?.insertId;
  const n = Number(cand);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// -------- Master API helpers --------
const MASTER_READ = (API as any).MASTER_READ || `${(API as any).BASE_URL || ''}/post/master_read_api.php`;
const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([,v]) => v !== undefined && v !== null && v !== '')
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
const speciesCode = (type: string) => (type === 'หมา' ? 'dog' : 'cat');
const fetchMaster = async (entity: string, params: any = {}) => {
  const qs = buildQuery(params);
  const url = `${MASTER_READ}?entity=${entity}${qs ? `&${qs}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.message || 'fetch master failed');
  return json.data as any[];
};
const toOptions = (rows: any[], idKey: string, nameKey = 'name_th'): Option[] =>
  rows.map((r) => ({ id: r[idKey], label: r[nameKey] || '' }));


// --- UI ช่วย ---
const ThemedDivider = () => (<View style={{height:1, backgroundColor:'#c7d7ff', marginVertical:12, marginHorizontal:10, borderRadius:1}} />);
const Section = ({children}:{children:React.ReactNode}) => (<View style={{ backgroundColor:'#f1f5ff', padding:12, borderRadius:14, marginBottom:12 }}>{children}</View>);
const Label = ({children}:{children:React.ReactNode}) => (<Text style={{ fontSize:16, fontWeight:'700', color:'#1f2a56', marginBottom:6 }}>{children}</Text>);
const Input = (props: React.ComponentProps<typeof TextInput>) => (<TextInput {...props} style={[styles.input, props.style]} placeholderTextColor="#9aa3c7" />);
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


const COLORS_DOG = ['ขาว','ดำ','น้ำตาล','ทอง','เทา','ดำ-น้ำตาล','ขาว-ดำ','ครีม','ผสม'];
const COLORS_CAT = ['ขาว','ดำ','ส้ม','เทา','ลายเสือ','ขาว-ดำ','ดำ-ส้ม','ครีม','ผสม'];

const FH_Post = () => {
    const navigation = useNavigation<any>();

  const [formData, setFormData] = useState({
    title:'', type:'หมา', breed:'', gender:'ผู้',
    ageYears:'', ageMonths:'', 
    color: [] as string[],
    neutered:'', vaccinated:'',
  });
  const [otherColorText, setOtherColorText] = useState('');

  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vaccineList, setVaccineList] = useState<string[]>([]);

  const [personalitySel, setPersonalitySel] = useState<string[]>([]);
  const [reasonSel, setReasonSel] = useState<string[]>([]);
  const [termSel, setTermSel] = useState<string[]>([]);

  const [breedOptions,setBreedOptions] = useState<Option[]>([]);
  const [vaccineOptions,setVaccineOptions] = useState<Option[]>([]);
  const [personalityOptions,setPersonalityOptions] = useState<Option[]>([]);
  const [reasonOptions,setReasonOptions] = useState<Option[]>([]);
  const [termOptions,setTermOptions] = useState<Option[]>([]);

  const tooltipMessage = "ข้อมูลสำคัญที่ใช้ในการจับคู่";

  const handleChange = (field: keyof typeof formData, val:any) => {
    setFormData(prev=>({...prev,[field]:val}));
    if (field === 'type') {
      setVaccineList([]);
      setFormData(prev => ({...prev, color: []})); 
      setOtherColorText('');
    }
  };

  const toggleColor = (c: string) => {
    setFormData(prev => {
        const currentColors = prev.color;
        const newColors = currentColors.includes(c)
            ? currentColors.filter(color => color !== c)
            : [...currentColors, c];
        return { ...prev, color: newColors };
    });
  };

  useEffect(()=>{
    const sp = speciesCode(formData.type);
    (async()=>{
      try{
        const [breeds, vaccines, personalities, reasons, terms] = await Promise.all([
          fetchMaster('breeds',{species:sp,active:1,per_page:300}),
          fetchMaster('vaccines',{species:sp,active:1,per_page:300}),
          fetchMaster('personalities',{species:sp,active:1,per_page:300}),
          fetchMaster('rehome_reasons',{active:1,per_page:300}),
          fetchMaster('adoption_terms',{active:1,order:'asc',per_page:300})
        ]);
        setBreedOptions(toOptions(breeds,'breed_id'));
        setVaccineOptions(toOptions(vaccines,'vaccine_id'));
        setPersonalityOptions(toOptions(personalities,'personality_id'));
        setReasonOptions(toOptions(reasons,'reason_id'));
        setTermOptions(toOptions(terms,'term_id'));
      }catch(e){ console.warn(e); }
    })();
  },[formData.type]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('กรุณาอนุญาตการเข้าถึงรูป/วิดีโอ'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsMultipleSelection: true, quality: 1 });
    if (!res.canceled && res.assets) {
      const selected: MediaAsset[] = res.assets.map((a:any) => ({ uri: a.uri, type: (a.type === 'video' ? 'video' : 'image') as 'image'|'video' }));
      setMedia(prev => [...prev, ...selected]);
    }
  };

  const uploadMediaFirst = async (): Promise<string[]> => {
    if (!media.length) return [];
    const fd = new FormData();
    media.forEach((m, idx) => {
      const ext = (m.uri.split('.').pop() || (m.type === 'video' ? 'mp4' : 'jpg')).toLowerCase();
      const mime = m.type === 'video' ? 'video/mp4' : 'image/jpeg';
      fd.append('media[]', { uri: m.uri, name: `media_${idx}.${ext}`, type: mime } as any);
    });
    const r = await fetch((API as any).UPLOAD_MEDIA, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data', Accept: 'application/json' },
      body: fd,
    });
    const j = await safeJson(r);
    if (j.status !== 'success' || !Array.isArray(j.files)) throw new Error(j.message || 'อัปโหลดสื่อไม่สำเร็จ');
    return j.files as string[];
  };

  const fetchMatchesAndNavigate = async (fhId: number) => {
    const MATCH = (API as any).MATCH_POSTS || `${(API as any).BASE_URL || ''}/post/match_posts.php`;
    const url = `${MATCH}?mode=from_fh&id=${fhId}&save=1`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    const j = await safeJson(r);
    if (j.status !== 'success') throw new Error(j.message || 'match failed');
    navigation.navigate('MatchResult', { items: j.data || [] });
  };

  const submit = async () => {
    if (!formData.title || !formData.breed) return Alert.alert('กรุณากรอกชื่อโพสต์และสายพันธุ์');
    if (!media.length) return Alert.alert('กรุณาเลือกรูป/วิดีโออย่างน้อย 1 รายการ');

    setIsSubmitting(true);
    try{
      const username = (await AsyncStorage.getItem('username')) || 'guest';
      const uploadedFiles = await uploadMediaFirst();

      let finalColors = formData.color.filter(c => c !== 'อื่นๆ');
      if (formData.color.includes('อื่นๆ') && otherColorText.trim()) {
          // [แก้ไข] เปลี่ยนตัวคั่นเป็น "," และ trim() แต่ละสี
          const otherColors = otherColorText.trim().split(',').map(c => c.trim()).filter(Boolean);
          finalColors = [...finalColors, ...otherColors];
      }

      const age = `${formData.ageYears?formData.ageYears+' ปี':''}${formData.ageMonths? ' '+formData.ageMonths+' เดือน':''}`.trim();
      const payload = {
        title:formData.title, type:formData.type, breed:formData.breed,
        sex:formData.gender, age, 
        color: finalColors.join(', '),
        steriliz:formData.neutered,
        vaccine: formData.vaccinated==='ฉีดวัคซีนแล้ว' ? vaccineList.join(', ') : 'ยังไม่ได้ฉีด',
        personality: personalitySel.join(', '), reason: reasonSel.join(', '), adoptionTerms: termSel.join(', '),
        image: uploadedFiles, user: username, postType: 'fh'
      };

      const resp = await fetch((API as any).POST_FIND_HOME, {
        method:'POST',
        headers:{'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify(payload)
      });
      const json = await safeJson(resp);

      if (json.status==='success') {
        const newId = extractId(json);
        if (newId > 0) await fetchMatchesAndNavigate(newId);
        else Alert.alert('สำเร็จบางส่วน','โพสต์สำเร็จ แต่ API ไม่ได้ส่ง insert_id กลับมา จึงยังไม่จับคู่อัตโนมัติ');

        setFormData({ title:'', type:'หมา', breed:'', gender:'ผู้', ageYears:'', ageMonths:'', color:[], neutered:'', vaccinated:'' });
        setOtherColorText('');
        setPersonalitySel([]); setReasonSel([]); setTermSel([]);
        setVaccineList([]); setMedia([]);
      } else {
        Alert.alert('ผิดพลาด', json.message || 'บันทึกไม่สำเร็จ');
      }
    }catch(e:any){
      Alert.alert('ผิดพลาด', e?.message || 'ไม่สามารถบันทึกได้');
    } finally { setIsSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Section>
          <Label>ชื่อโพสต์</Label>
          <Input placeholder="กรอกชื่อโพสต์" value={formData.title} onChangeText={(t:string)=>handleChange('title',t)} />
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>ชนิดของสัตว์เลี้ยง</LabelWithTooltip>
          <View style={styles.row}>
            {['หมา','แมว'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.type===opt && styles.pillActive]} onPress={()=>handleChange('type',opt)}>
                <Text style={[styles.pillText, formData.type===opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>สายพันธุ์</LabelWithTooltip>
          <ThemedPicker selectedValue={formData.breed} onValueChange={(v:any)=>handleChange('breed',String(v))} options={breedOptions} placeholder="-- เลือกสายพันธุ์ --" />
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>เพศ</LabelWithTooltip>
          <View style={styles.row}>
            {['ผู้','เมีย'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.gender===opt && styles.pillActive]} onPress={()=>handleChange('gender',opt)}>
                <Text style={[styles.pillText, formData.gender===opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>อายุ</LabelWithTooltip>
          <View style={{flexDirection:'row', gap:10}}>
            <Input style={{flex:1}} placeholder="ปี" keyboardType="numeric" value={formData.ageYears} onChangeText={(t:string)=>handleChange('ageYears',t)} />
            <Input style={{flex:1}} placeholder="เดือน" keyboardType="numeric" value={formData.ageMonths} onChangeText={(t:string)=>handleChange('ageMonths',t)} />
          </View>
          <ThemedDivider />
          
          <LabelWithTooltip tooltip={tooltipMessage}>สี</LabelWithTooltip>
          <View style={styles.row}>
            {[...(formData.type === 'หมา' ? COLORS_DOG : COLORS_CAT), 'อื่นๆ'].map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.pill, formData.color.includes(c) && styles.pillActive]} 
                onPress={() => toggleColor(c)}
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
              <TouchableOpacity key={opt} style={[styles.pill, formData.neutered===opt && styles.pillActive]} onPress={()=>handleChange('neutered',opt)}>
                <Text style={[styles.pillText, formData.neutered===opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <LabelWithTooltip tooltip={tooltipMessage}>สถานะวัคซีน</LabelWithTooltip>
          <View style={styles.row}>
            {['ฉีดวัคซีนแล้ว','ยังไม่ได้ฉีด'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.vaccinated===opt && styles.pillActive]} onPress={()=>handleChange('vaccinated',opt)}>
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

          <Label>นิสัยโดยรวม (สูงสุด 3)</Label>
          <MultiSelectDropdown options={personalityOptions} selected={personalitySel} onChange={setPersonalitySel} placeholder="-- เลือกนิสัย --" max={3} />
          <ThemedDivider />

          <Label>เหตุผลในการหาบ้าน (สูงสุด 3)</Label>
          <MultiSelectDropdown options={reasonOptions} selected={reasonSel} onChange={setReasonSel} placeholder="-- เลือกเหตุผล --" max={3} />
          <ThemedDivider />

          <Label>เงื่อนไขและข้อตกลง (สูงสุด 3)</Label>
          <MultiSelectDropdown options={termOptions} selected={termSel} onChange={setTermSel} placeholder="-- เลือกเงื่อนไข --" max={3} />
        </Section>

        <Section>
          <Label>รูป/วิดีโอ</Label>
          <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
            {media.map((m,i)=>(
              <View key={i} style={{width:92, height:92, backgroundColor:'#e3eaff', borderRadius:12, overflow:'hidden'}}>
                {m.type==='video'
                  ? <Video source={{uri:m.uri}} style={{width:'100%',height:'100%'}} resizeMode={ResizeMode.COVER} />
                  : <Image source={{uri:m.uri}} style={{width:'100%',height:'100%'}} />}
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btnSecondary} onPress={pickMedia}><Text style={styles.btnSecondaryText}>เลือกรูป/วิดีโอ</Text></TouchableOpacity>
        </Section>

        <TouchableOpacity style={styles.btnPrimary} onPress={submit} disabled={isSubmitting}>
          <Text style={styles.btnPrimaryText}>{isSubmitting?'กำลังบันทึก...':'โพสต์'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FH_Post;

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