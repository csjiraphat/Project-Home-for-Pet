// ✅ Edit_Home.tsx (สำหรับ postType === 'fh')

import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, StyleSheet, SafeAreaView
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../../../android/app/src/config';
import { useNavigation, useRoute } from '@react-navigation/native';
import CustomHeader from '../../../../components/CustomHeader';
import BottomBar from '../../../../components/BottomBar';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Dimensions } from 'react-native';

type Props = {
    formData: any;
    handleChange: (field: string, value: string) => void;
    vaccineList: string[];
    setVaccineList: (list: string[]) => void;
};

const parseAge = (str: string): { year: string; month: string } => {
    const match = str.match(/(\d+)\s?ปี\s?(\d+)\s?เดือน/);
    return match ? { year: match[1], month: match[2] } : { year: '', month: '' };
};

const EditHomeForm = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { post } = route.params as any;
    const { year, month } = parseAge(post.age || '');

    const [formData, setFormData] = useState({
        title: post.title || '',
        type: post.type || 'หมา',
        breed: post.breed || '',
        gender: post.sex || 'ผู้',
        ageYears: year,
        ageMonths: month,
        color: post.color || '',
        neutered: post.steriliz === 'yes' ? 'yes' : 'no',
        vaccinated: post.vaccine === 'ยังไม่ได้ฉีด' ? 'ยังไม่ได้ฉีด' : 'ฉีดวัคซีนแล้ว',
        personality: post.personality || '',
        reason: post.reason || '',
        adoptionTerms: post.adoptionTerms || ''
    });

    const [mediaAssets, setMediaAssets] = useState<any[]>([]);
    const [vaccineList, setVaccineList] = useState(
        post.vaccine && post.vaccine !== 'ยังไม่ได้ฉีด' ? post.vaccine.split(',').map((v: string) => v.trim()) : []
    );

    useEffect(() => {
        if (post.image) {
            const images = typeof post.image === 'string' ? JSON.parse(post.image) : post.image;
            const assets = images.map((img: string) => ({
                uri: `${API.UPLOAD_PATH}${img.replace(/^uploads\//, '')}`,
                type: img.endsWith('.mp4') ? 'video' : 'image'
            }));
            setMediaAssets(assets);
        }
    }, []);

    const handleChange = (field: string, value: string) => {
        if (field === 'type') setVaccineList([]);

        if (field === 'ageMonths') {
            let month = parseInt(value || '0', 10);
            let year = parseInt(formData.ageYears || '0', 10);

            if (month >= 12) {
                year += Math.floor(month / 12);
                month = month % 12;
            }

            setFormData(prev => ({
                ...prev,
                ageYears: year ? String(year) : '',
                ageMonths: month ? String(month) : ''
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };


    const uploadMediaIfNeeded = async () => {
        const uploaded: string[] = [];

        const form = new FormData();
        let hasNewMedia = false;

        for (let i = 0; i < mediaAssets.length; i++) {
            const item = mediaAssets[i];

            if (item.uri.startsWith(API.UPLOAD_PATH)) {
                // ✅ เก็บชื่อไฟล์เดิม
                uploaded.push(item.uri.replace(API.UPLOAD_PATH, ''));
                continue;
            }

            hasNewMedia = true;

            form.append('media[]', {
                uri: item.uri,
                name: `media_${Date.now()}_${i}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
                type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
            } as any);
        }

        if (!hasNewMedia) return uploaded;

        try {
            const res = await fetch(`${API.UPLOAD_MEDIA}`, {
                method: 'POST',
                body: form,
            });

            const result = await res.json();
            if (result.status === 'success') {
                uploaded.push(...result.files.map((f: string) => f.replace(/^uploads\//, '')));
            } else {
                console.warn('❌ Upload failed:', result);
            }
        } catch (err) {
            console.error('❌ Upload error:', err);
        }

        return uploaded;
    };

    const vaccineOptions =
        formData.type === 'หมา'
            ? ['วัคซีนป้องกันโรคไข้หัด', 'โรคลำไส้อักเสบ', 'โรคตับอักเสบ', 'โรคพาร์โวไวรัส', 'โรคพิษสุนัขบ้า']
            : ['วัคซีนป้องกันโรคไข้หัด', 'โรคระบบทางเดินหายใจส่วนต้น', 'โรคลิวคีเมีย', 'โรคพิษสุนัขบ้า'];
    const RadioButton = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
        <TouchableOpacity style={styles.radioOption} onPress={onPress}>
            <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
            <Text style={styles.radioLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const formatSteriliz = (steriliz: string) => {
        if (steriliz === 'yes') return 'ทำหมันแล้ว';
        if (steriliz === 'no') return 'ยังไม่ได้ทำหมัน';
        return '-';
    };

    const handleSubmit = async () => {
        const uploaded = await uploadMediaIfNeeded();
        const username = await AsyncStorage.getItem('username');
        if (!username) return Alert.alert('กรุณาเข้าสู่ระบบ');

        const payload = {
            id: post.id,
            user: username,
            postType: 'fh',
            title: formData.title,
            type: formData.type,
            breed: formData.breed,
            sex: formData.gender,
            age: `${formData.ageYears ? `${formData.ageYears} ปี` : ''} ${formData.ageMonths ? `${formData.ageMonths} เดือน` : ''}`.trim(),
            color: formData.color,
            steriliz: formData.neutered,
            vaccine: formData.vaccinated === 'ฉีดวัคซีนแล้ว' ? vaccineList.join(', ') : 'ยังไม่ได้ฉีด',
            personality: formData.personality,
            reason: formData.reason,
            adoptionTerms: formData.adoptionTerms,
            image: uploaded
        };

        try {
            const res = await fetch(`${API.POST_UPDATE_HOME}?id=${post.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            console.log('🚨 raw response:', text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonErr) {
                console.error('❌ JSON parse error:', jsonErr);
                Alert.alert('ผิดพลาด', 'คำตอบจากเซิร์ฟเวอร์ไม่ถูกต้อง');
                return;
            }

            if (data.status === 'success') {
                Alert.alert(
                    'บันทึกสำเร็จ',
                    'อัปเดตโพสต์เรียบร้อยแล้ว',
                    [
                        {
                            text: 'ตกลง',
                            onPress: () => navigation.goBack()
                        }
                    ]
                );
            } else {
                Alert.alert(
                    'ล้มเหลว',
                    data.message || 'ไม่สามารถบันทึกได้'
                );
            }

        } catch (err) {
            console.error('❌ ไม่สามารถส่งข้อมูล:', err);
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    };



    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.label}>ชื่อโพสต์</Text>
                <TextInput style={styles.input} value={formData.title} onChangeText={(t) => handleChange('title', t)} />
                <Text style={styles.label}>ชนิดของสัตว์เลี้ยง</Text>
                <View style={styles.radioGroup}>
                    {['หมา', 'แมว'].map((option) => (
                        <RadioButton key={option} label={option} selected={formData.type === option} onPress={() => handleChange('type', option)} />
                    ))}
                </View>

                <Text style={styles.label}>สายพันธุ์</Text>
                <TextInput style={styles.input} value={formData.breed} onChangeText={(text) => handleChange('breed', text)} />

                <Text style={styles.label}>เพศ</Text>
                <View style={styles.radioGroup}>
                    {['ผู้', 'เมีย'].map((option) => (
                        <RadioButton key={option} label={option} selected={formData.gender === option} onPress={() => handleChange('gender', option)} />
                    ))}
                </View>

                <Text style={styles.label}>อายุ</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="ปี" value={formData.ageYears} keyboardType="numeric" onChangeText={(t) => handleChange('ageYears', t)} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="เดือน" value={formData.ageMonths} keyboardType="numeric" onChangeText={(t) => handleChange('ageMonths', t)} />
                </View>

                <Text style={styles.label}>สี</Text>
                <TextInput style={styles.input} value={formData.color} onChangeText={(t) => handleChange('color', t)} />

                <Text style={styles.label}>สถานะการทำหมัน</Text>
                <View style={styles.radioGroup}>
                    {['yes', 'no'].map((option) => (
                        <RadioButton
                            key={option}
                            label={option === 'yes' ? 'ทำหมันแล้ว' : 'ยังไม่ได้ทำ'}
                            selected={formData.neutered === option}
                            onPress={() => handleChange('neutered', option)}
                        />
                    ))}
                </View>

                <Text style={styles.label}>ประวัติการฉีดวัคซีน</Text>
                <View style={styles.radioGroup}>
                    {['ฉีดวัคซีนแล้ว', 'ยังไม่ได้ฉีด'].map((option) => (
                        <RadioButton key={option} label={option} selected={formData.vaccinated === option} onPress={() => {
                            handleChange('vaccinated', option);
                            if (option === 'ยังไม่ได้ฉีด') setVaccineList([]);
                        }} />
                    ))}
                </View>

                {formData.vaccinated === 'ฉีดวัคซีนแล้ว' && vaccineOptions.map((vaccine) => (
                    <TouchableOpacity key={vaccine} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }} onPress={() => {
                        setVaccineList((prev: string[]) => prev.includes(vaccine) ? prev.filter(v => v !== vaccine) : [...prev, vaccine]);
                    }}>
                        <View style={[styles.checkbox, vaccineList.includes(vaccine) && styles.checkboxSelected]} />
                        <Text style={{ marginLeft: 8 }}>{vaccine}</Text>
                    </TouchableOpacity>
                ))}

                <Text style={styles.label}>นิสัยโดยรวม</Text>
                <TextInput style={styles.input} value={formData.personality} onChangeText={(t) => handleChange('personality', t)} />

                <Text style={styles.label}>เหตุผลในการหาบ้าน</Text>
                <TextInput style={styles.input} value={formData.reason} onChangeText={(t) => handleChange('reason', t)} />

                <Text style={styles.label}>เงื่อนไขในการรับเลี้ยง</Text>
                <TextInput style={styles.input} value={formData.adoptionTerms} onChangeText={(t) => handleChange('adoptionTerms', t)} />

                <Text style={styles.label}>รูปภาพ / วิดีโอ</Text>
                <View style={styles.mediaContainer}>
                    <View style={styles.gridContainer}>
                        {mediaAssets.map((asset, index) => (
                            <View key={index} style={styles.gridItem}>
                                <TouchableOpacity
                                    style={styles.deleteBadge}
                                    onPress={() => {
                                        setMediaAssets((prev) => prev.filter((_, i) => i !== index));
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 12 }}>ลบ</Text>
                                </TouchableOpacity>

                                {asset.type === 'video' ? (
                                    <Video
                                        source={{ uri: asset.uri }}
                                        style={styles.mediaPreview}
                                        resizeMode={ResizeMode.COVER}
                                        useNativeControls
                                    />
                                ) : (
                                    <Image source={{ uri: asset.uri }} style={styles.mediaPreview} />
                                )}
                            </View>
                        ))}

                        {mediaAssets.length < 6 && (
                            <TouchableOpacity
                                style={[styles.gridItem, styles.addMediaBox]}
                                onPress={async () => {
                                    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                    if (!permission.granted) return Alert.alert('ขอสิทธิ์เข้าถึงรูปภาพ');

                                    const result = await ImagePicker.launchImageLibraryAsync({
                                        mediaTypes: ImagePicker.MediaTypeOptions.All,
                                        allowsMultipleSelection: true, // ✅ เปิดหลายไฟล์
                                        selectionLimit: 5,              // ✅ สูงสุด 5 ไฟล์ (ปรับได้ตามต้องการ)
                                        quality: 0.7,
                                    });
                                    if (mediaAssets.length >= 6) {
                                        Alert.alert('อัปโหลดได้สูงสุด 6 ไฟล์');
                                        return;
                                    }
                                    if (!result.canceled && result.assets?.length > 0) {
                                        const newAssets = result.assets.map((asset) => ({
                                            uri: asset.uri,
                                            type: asset.type === 'video' ? 'video' : 'image',
                                        }));
                                        setMediaAssets((prev) => [...prev, ...newAssets]);
                                    }
                                }}
                            >
                                <Text style={styles.uploadButtonText}>+ เพิ่ม</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>



                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>บันทึกการแก้ไข</Text>
                </TouchableOpacity>
            </ScrollView>
            <BottomBar />
        </SafeAreaView>
    );
};

const ITEM_SIZE = (Dimensions.get('window').width - 48) / 3; // 16 padding * 2 + 12 gap * 2

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100, backgroundColor: '#fff' },
    label: { marginTop: 12, fontWeight: 'bold', fontSize: 14, color: '#333' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 4,
        backgroundColor: '#f9f9f9',
    },
    radioGroup: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
    radioOption: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginTop: 6 },
    radioDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#555',
        marginRight: 6,
        backgroundColor: '#fff',
    },
    radioDotSelected: {
        backgroundColor: '#4ade80',
        borderColor: '#4ade80',
    },
    radioLabel: { fontSize: 14, color: '#333' },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: '#999',
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    checkboxSelected: {
        backgroundColor: '#4ade80',
        borderColor: '#4ade80',
    },
    uploadButton: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#dbeafe',
        borderRadius: 8,
        alignItems: 'center',
    },
    uploadButtonText: { color: '#2563eb', fontWeight: 'bold' },
    submitButton: {
        marginTop: 20,
        backgroundColor: '#4ade80',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2563eb',
        textAlign: 'center',
    },
    submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    deleteBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: 'red',
        borderRadius: 12,
        padding: 4,
        zIndex: 1,
    },
    mediaContainer: {
        marginTop: 8,
        marginBottom: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12,
        marginTop: 8,
    },

    gridItem: {
        width: '31%',
        height: ITEM_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#eee',
    },

    mediaPreview: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },

    addMediaBox: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#dbeafe',
    },

});

export default EditHomeForm;