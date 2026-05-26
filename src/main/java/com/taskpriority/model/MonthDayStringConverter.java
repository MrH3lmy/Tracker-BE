package com.taskpriority.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.MonthDay;

@Converter
public class MonthDayStringConverter implements AttributeConverter<MonthDay, String> {

    @Override
    public String convertToDatabaseColumn(MonthDay attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public MonthDay convertToEntityAttribute(String dbData) {
        return dbData == null ? null : MonthDay.parse(dbData);
    }
}
