// ✅ Edit_Home.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, SafeAreaView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import API from '../../../../android/app/src/config';

type Option = { id: number; label: string };
type MediaAsset = { uri: string; type: 'image' | 'video' };


const MASTER_READ = (API as any).MASTER_READ || `${(API as any).BASE_URL || ''}/post/master_read_api.php`;
const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
const speciesCode = (type: string) => (type === 'หมา' ? 'dog' : 'cat');
const fetchMaster = async (entity: string, params: any = {}) => {
  const qs = buildQuery(params);
  const res = await fetch(`${MASTER_READ}?entity=${entity}${qs ? `&${qs}` : ''}`);
  const json = await res.json();
  if (json?.status !== 'success') throw new Error(json?.message || 'fetch master failed');
  return json.data as any[];
};
const toOptions = (rows: any[], idKey: string, nameKey = 'name_th'): Option[] =>
  rows.map((r: any) => ({ id: r[idKey], label: r[nameKey] || '' }));

const toAbsolute = (p: string) => {
  const clean = p.replace(/^uploads\//, '');
  return p.startsWith('http') ? p : `${(API as any).UPLOAD_PATH}${clean}`;
};
const normalizeInitialMedia = (value: any): MediaAsset[] => {
  if (!value) return [];
  let arr: string[] = [];
  if (Array.isArray(value)) arr = value;
  else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) arr = parsed as string[];
      else arr = String(value).split(',');
    } catch { arr = String(value).split(','); }
  }
  return arr.map(s => String(s).trim()).filter(Boolean).map((f) => {
    const uri = toAbsolute(f);
    const ext = (f.split('.').pop() || '').toLowerCase();
    const type: 'image' | 'video' = ['mp4', 'mov', 'm4v', 'webm'].includes(ext) ? 'video' : 'image';
    return { uri, type };
  });
};

const ThemedDivider = () => <View style={{ height: 1, backgroundColor: '#c7d7ff', marginVertical: 12, marginHorizontal: 10, borderRadius: 1 }} />;
const Section = ({ children }: { children: React.ReactNode }) => <View style={{ backgroundColor: '#f1f5ff', padding: 12, borderRadius: 14, marginBottom: 12 }}>{children}</View>;
const Label = ({ children }: { children: React.ReactNode }) => <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2a56', marginBottom: 6 }}>{children}</Text>;
const Input = (props: React.ComponentProps<typeof TextInput>) => <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor="#9aa3c7" />;

const MultiSelectDropdown = ({ options, selected, onChange, placeholder, max = 3 }:
  { options: Option[]; selected: string[]; onChange: (next: string[]) => void; placeholder: string; max?: number }) => {
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
    <View style={{ borderWidth: 1, borderColor: '#cbd5ff', borderRadius: 12, backgroundColor: '#fff' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ padding: 12 }}>
        <Text style={{ color: selected.length ? '#1f2a56' : '#9aa3c7' }}>
          {selected.length ? selected.join(', ') : placeholder}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7ff', paddingVertical: 6 }}>
          {options.map(opt => (
            <TouchableOpacity key={opt.id} style={styles.checkRow} onPress={() => toggle(opt.label)}>
              <View style={[styles.checkbox, selected.includes(opt.label) && styles.checkboxActive]} />
              <Text style={{ marginLeft: 8 }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const COLORS_DOG = ['ขาว', 'ดำ', 'น้ำตาล', 'ทอง', 'เทา', 'ดำ-น้ำตาล', 'ขาว-ดำ', 'ครีม', 'ผสม'];
const COLORS_CAT = ['ขาว', 'ดำ', 'ส้ม', 'เทา', 'ลายเสือ', 'ขาว-ดำ', 'ดำ-ส้ม', 'ครีม', 'ผสม'];

const MATCH_POSTS = (API as any).MATCH_POSTS || `${(API as any).BASE_URL || ''}/post/match_posts.php`;
const MATCH_RESULT_ROUTE = (API as any).ROUTE_MATCH_RESULT || 'MatchResult';

const Edit_Home = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { post } = route.params as any;

  const parseAge = (str: string) => {
    const m = str?.match(/(\d+)\s?ปี\s?(\d+)\s?เดือน/);
    return m ? { year: m[1], month: m[2] } : { year: '', month: '' };
  };
  const { year, month } = parseAge(post?.age || '');

  const [formData, setFormData] = useState({
    title: post?.title || '',
    type: post?.type || 'หมา',
    breed: post?.breed || '',
    gender: post?.sex || 'ผู้',
    ageYears: year,
    ageMonths: month,
    color: post?.color || '',
    neutered: post?.steriliz || '',
    vaccinated: post?.vaccine === 'ยังไม่ได้ฉีด' ? 'ยังไม่ได้ฉีด' : 'ฉีดวัคซีนแล้ว',
  });

  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(normalizeInitialMedia(post?.image));
  const [vaccineList, setVaccineList] = useState<string[]>(
    post?.vaccine && post?.vaccine !== 'ยังไม่ได้ฉีด' ? String(post?.vaccine).split(',').map((s: string) => s.trim()) : []
  );

  const [breedOptions, setBreedOptions] = useState<Option[]>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Option[]>([]);
  const [personalityOptions, setPersonalityOptions] = useState<Option[]>([]);
  const [reasonOptions, setReasonOptions] = useState<Option[]>([]);
  const [termOptions, setTermOptions] = useState<Option[]>([]);
  const [colorOptions, setColorOptions] = useState<string[]>(formData.type === 'หมา' ? COLORS_DOG : COLORS_CAT);
  const [personalitySel, setPersonalitySel] = useState<string[]>(post?.personality ? String(post?.personality).split(',').map((s: string) => s.trim()) : []);
  const [reasonSel, setReasonSel] = useState<string[]>(post?.reason ? String(post?.reason).split(',').map((s: string) => s.trim()) : []);
  const [termSel, setTermSel] = useState<string[]>(post?.adoptionTerms ? String(post?.adoptionTerms).split(',').map((s: string) => s.trim()) : []);

  useEffect(() => {
    setColorOptions(formData.type === 'หมา' ? COLORS_DOG : COLORS_CAT);
    const sp = speciesCode(formData.type);
    (async () => {
      try {
        const [breeds, vaccines, personalities, reasons, terms] = await Promise.all([
          fetchMaster('breeds', { species: sp, active: 1, per_page: 300 }),
          fetchMaster('vaccines', { species: sp, active: 1, per_page: 300 }),
          fetchMaster('personalities', { species: sp, active: 1, per_page: 300 }),
          fetchMaster('rehome_reasons', { active: 1, per_page: 300 }),
          fetchMaster('adoption_terms', { active: 1, per_page: 300 }),
        ]);
        setBreedOptions(toOptions(breeds, 'breed_id'));
        setVaccineOptions(toOptions(vaccines, 'vaccine_id'));
        setPersonalityOptions(toOptions(personalities, 'personality_id'));
        setReasonOptions(toOptions(reasons, 'reason_id'));
        setTermOptions(toOptions(terms, 'term_id'));
      } catch (e) { console.warn(e); }
    })();
  }, [formData.type]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('กรุณาอนุญาตการเข้าถึงรูป/วิดีโอ');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsMultipleSelection: true });
    if (!res.canceled && res.assets) {
      const selected: MediaAsset[] = res.assets.map((a: any) => ({ uri: a.uri, type: ((a as any).type === 'video' ? 'video' : 'image') as 'image' | 'video' }));
      setMediaAssets(prev => [...prev, ...selected]);
    }
  };
  const removeMedia = (idx: number) => setMediaAssets(prev => prev.filter((_, i) => i !== idx));
  const handleChange = (field: keyof typeof formData, v: string) => setFormData(prev => ({ ...prev, [field]: v }));

  // Upload only new files
  const uploadMediaIfNeeded = async (media: MediaAsset[]): Promise<string[]> => {
    const out: string[] = [];
    const form = new FormData();
    let hasNew = false;
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      if (m.uri.startsWith((API as any).UPLOAD_PATH)) { out.push(m.uri.replace((API as any).UPLOAD_PATH, '')); continue; }
      hasNew = true;
      form.append('media[]', { uri: m.uri, name: `media_${Date.now()}_${i}.${m.type === 'video' ? 'mp4' : 'jpg'}`, type: m.type === 'video' ? 'video/mp4' : 'image/jpeg' } as any);
    }
    if (!hasNew) return out;
    try {
      const resp = await fetch((API as any).UPLOAD_MEDIA, { method: 'POST', body: form });
      const json = await resp.json();
      if (json?.status === 'success' && Array.isArray(json.files)) out.push(...json.files.map((f: string) => f.replace(/^uploads\//, '')));
    } catch (e) { console.warn('upload error', e); }
    return out;
  };

  // ✅ Re-match (เขียนทับประวัติเดิม)
  const rematchAfterUpdateFH = async (id: number) => {
    try {
      const url = `${MATCH_POSTS}?mode=from_fh&id=${id}&save=1&overwrite=1`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      const j = await r.json();
      if (j?.status === 'success') {
        try {
          navigation.navigate(MATCH_RESULT_ROUTE, {
            mode: 'from_fh',
            sourceId: id,
            items: j.data,
            raw: j
          });
        } catch {
          Alert.alert('อัปเดตสำเร็จ', `จับคู่ใหม่แล้ว ${j?.data?.length || 0} รายการ`);
        }
      } else {
        Alert.alert('อัปเดตสำเร็จ', `บันทึกโพสต์แล้ว แต่จับคู่ใหม่ไม่สำเร็จ: ${j?.message || 'ไม่ทราบสาเหตุ'}`);
      }
    } catch (e: any) {
      Alert.alert('อัปเดตสำเร็จ', `บันทึกโพสต์แล้ว แต่เรียกจับคู่ใหม่ไม่ได้: ${e?.message || e}`);
    }
  };

  const submit = async () => {
    const username = await AsyncStorage.getItem('username') || 'guest';
    const files = await uploadMediaIfNeeded(mediaAssets);
    const age = `${formData.ageYears ? formData.ageYears + ' ปี' : ''} ${formData.ageMonths ? formData.ageMonths + ' เดือน' : ''}`.trim();

    const payloadObj = {
      id: post.id, user: username, postType: 'fh',
      title: formData.title, type: formData.type, breed: formData.breed, sex: formData.gender,
      age, color: formData.color, steriliz: formData.neutered,
      vaccine: formData.vaccinated === 'ฉีดวัคซีนแล้ว' ? (vaccineList.join(', ')) : 'ยังไม่ได้ฉีด',
      personality: personalitySel.join(', '),
      reason: reasonSel.join(', '),
      adoptionTerms: termSel.join(', '),
      image: files
    };

    try {
      const res = await fetch(`${(API as any).POST_UPDATE_HOME}?id=${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadObj)
      });
      const text = await res.text();
      let json: any = null; try { json = JSON.parse(text); } catch { }
      if (json?.status === 'success') {

        await rematchAfterUpdateFH(post.id);

      }
      else Alert.alert('ผิดพลาด', (json && json.message) || text || 'บันทึกไม่ได้');
    } catch (e: any) { Alert.alert('ผิดพลาด', e?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>แก้ไขโพสต์ (หาบ้านให้สัตว์)</Text>

        <Section>
          <Label>ชื่อโพสต์</Label>
          <Input value={formData.title} onChangeText={(t) => handleChange('title', t)} />
          <ThemedDivider />

          <Label>ชนิดของสัตว์เลี้ยง</Label>
          <View style={styles.row}>
            {['หมา', 'แมว'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.type === opt && styles.pillActive]} onPress={() => handleChange('type', opt)}>
                <Text style={[styles.pillText, formData.type === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>สายพันธุ์</Label>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={formData.breed} onValueChange={(v) => handleChange('breed', String(v))}>
              <Picker.Item label="-- เลือกสายพันธุ์ --" value="" />
              {breedOptions.map(opt => <Picker.Item key={opt.id} label={opt.label} value={opt.label} />)}
            </Picker>
          </View>
          <ThemedDivider />

          <Label>เพศ</Label>
          <View style={styles.row}>
            {['ผู้', 'เมีย'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.gender === opt && styles.pillActive]} onPress={() => handleChange('gender', opt)}>
                <Text style={[styles.pillText, formData.gender === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>อายุ</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input style={{ flex: 1 }} placeholder="ปี" keyboardType="numeric" value={formData.ageYears} onChangeText={(t) => handleChange('ageYears', t)} />
            <Input style={{ flex: 1 }} placeholder="เดือน" keyboardType="numeric" value={formData.ageMonths} onChangeText={(t) => handleChange('ageMonths', t)} />
          </View>
          <ThemedDivider />

          <Label>สี (เลือกได้ 1)</Label>
          <View style={styles.row}>
            {(formData.type === 'หมา' ? COLORS_DOG : COLORS_CAT).map(c => (
              <TouchableOpacity key={c} style={[styles.pill, formData.color === c && styles.pillActive]} onPress={() => handleChange('color', c)}>
                <Text style={[styles.pillText, formData.color === c && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>สถานะทำหมัน</Label>
          <View style={styles.row}>
            {['ทำหมันแล้ว', 'ยังไม่ได้ทำหมัน', 'ไม่ระบุ'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.neutered === opt && styles.pillActive]} onPress={() => handleChange('neutered', opt)}>
                <Text style={[styles.pillText, formData.neutered === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>สถานะวัคซีน</Label>
          <View style={styles.row}>
            {['ฉีดวัคซีนแล้ว', 'ยังไม่ได้ฉีด'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.vaccinated === opt && styles.pillActive]} onPress={() => handleChange('vaccinated', opt)}>
                <Text style={[styles.pillText, formData.vaccinated === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.vaccinated === 'ฉีดวัคซีนแล้ว' && (
            <View style={{ marginTop: 8 }}>
              {vaccineOptions.map(opt => (
                <TouchableOpacity key={opt.id} style={styles.checkRow} onPress={() => {
                  setVaccineList(prev => prev.includes(opt.label) ? prev.filter(v => v !== opt.label) : [...prev, opt.label]);
                }}>
                  <View style={[styles.checkbox, vaccineList.includes(opt.label) && styles.checkboxActive]} />
                  <Text style={{ marginLeft: 8 }}>{opt.label}</Text>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {mediaAssets.map((m, i) => (
              <View key={i} style={{ width: 100 }}>
                <View style={{ width: 100, height: 100, backgroundColor: '#e3eaff', borderRadius: 12, overflow: 'hidden' }}>
                  {m.type === 'video' ? <Video source={{ uri: m.uri }} style={{ width: '100%', height: '100%' }} resizeMode={ResizeMode.COVER} /> : <Image source={{ uri: m.uri }} style={{ width: '100%', height: '100%' }} />}
                </View>
                <TouchableOpacity onPress={() => removeMedia(i)} style={{ alignSelf: 'center', marginTop: 6 }}>
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>ลบ</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btnSecondary} onPress={pickMedia}><Text style={styles.btnSecondaryText}>เพิ่มรูป/วิดีโอ</Text></TouchableOpacity>
        </Section>

        <TouchableOpacity style={styles.btnPrimary} onPress={submit}>
          <Text style={styles.btnPrimaryText}>บันทึกการแก้ไขและรี-แมตช์</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Edit_Home;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: '#1f2a56', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5ff', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#1f2a56' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5ff', marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#1f2a56' },
  pillText: { color: '#1f2a56', fontWeight: '700' },
  pillTextActive: { color: '#fff', fontWeight: '800' },

  pickerWrap: { borderWidth: 1, borderColor: '#cbd5ff', borderRadius: 12, backgroundColor: '#fff' },

  btnPrimary: { backgroundColor: '#1f2a56', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  btnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1f2a56', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start', marginTop: 10 },
  btnSecondaryText: { color: '#1f2a56', fontWeight: '700' },

  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#9aa3c7', backgroundColor: '#fff' },
  checkboxActive: { backgroundColor: '#1f2a56', borderColor: '#1f2a56' },
});
